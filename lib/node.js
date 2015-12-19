/**
* @module kad/node
*/

'use strict';

var merge = require('merge');
var assert = require('assert');
var async = require('async');
var inherits = require('util').inherits;
var events = require('events');
var constants = require('./constants');
var Router = require('./router');
var Message = require('./message');
var Item = require('./item');
var Logger = require('./logger');
var transports = require('./transports');

inherits(Node, events.EventEmitter);

Node.DEFAULTS = {
  transport: transports.UDP,
  logger: new Logger(4)
};

/**
* Represents a Kademlia node
* @constructor
* @param {object} options
*/
function Node(options) {
  options = merge(Object.create(Node.DEFAULTS), options);

  if (!(this instanceof Node)) {
    return new Node(options);
  }

  events.EventEmitter.call(this);
  this._setStorageAdapter(options.storage);

  this._log = options.logger;
  this._rpc = options.transport(options);
  this._self = this._rpc._contact;
  this._validator = options.validate;

  this._router = new Router({
    logger: options.logger,
    contact: this._self,
    rpc: this._rpc,
    validator: this._validateKeyValuePair.bind(this)
  });

  this._bindRPCMessageHandlers();
  this._startReplicationInterval();
  this._startExpirationInterval();
  this._log.debug('node created with nodeID %s', this._self.nodeID);
}

/**
* Connects to the overlay network
* #connect
* @param {string} options transport-specific contact options
* @param {function} callback - optional
*/
Node.prototype.connect = function(options, callback) {
  if (callback) {
    this.once('connect', callback);
    this.once('error', callback);
  }

  var self = this;
  var seed = this._rpc._createContact(options);

  this._log.debug('entering overlay network via %j', seed);

  async.waterfall([
    this._router.updateContact.bind(this._router, seed),
    this._router.findNode.bind(this._router, this._self.nodeID),
    this._router.refreshBucketsBeyondClosest.bind(this._router)
  ], function(err) {
    if (err) {
      return self.emit('error', err);
    }

    self.emit('connect');
  });

  return this;
};

/**
* Validate a key/value pair (defaults to always valid).
* #_validateKeyValuePair
* @param {string} key
* @param {mixed} value
* @param {function} callback
*/
Node.prototype._validateKeyValuePair = function(key, value, callback) {
  if (typeof this._validator === 'function') {
    return this._validator.apply(this, arguments);
  }

  callback(true);
};

/**
* Set a key/value pair in the DHT
* #set
* @param {string} key
* @param {mixed} value
* @param {function} callback
*/
Node.prototype.put = function(key, value, callback) {
  var node = this;

  this._log.debug('attempting to set value for key %s', key);

  this._validateKeyValuePair(key, value, function(valid) {
    if (!valid) {
      node._log.warn('failed to validate key/value pair for %s', key);
      return callback(new Error('Failed to validate key/value pair'));
    }

    node._putValidatedKeyValue(key, value, callback);
  });
};

/**
* Set a validated key/value pair in the DHT
* #set
* @param {string} key
* @param {mixed} value
* @param {function} callback
*/
Node.prototype._putValidatedKeyValue = function(key, value, callback) {
  var node = this;
  var item = new Item(key, value, this._self.nodeID);

  this._router.findNode(item.key, function(err, contacts) {
    if (err) {
      node._log.error('failed to find nodes - reason: %s', err.message);
      return callback(err);
    }

    if (contacts.length === 0) {
      node._log.error('no contacts are available');
      contacts = node._router.getNearestContacts(
        key,
        constants.K,
        node._self.nodeID
      );
    }

    node._log.debug('found %d contacts for STORE operation', contacts.length);

    async.each(contacts, function(contact, done) {
      var message = new Message({
        method: 'STORE',
        params: { item: item, contact: node._self }
      });
      node._log.debug('sending STORE message to %j', contact);
      node._rpc.send(contact, message, done);
    }, callback);
  });
};

/**
* Get a value by it's key from the DHT
* #get
* @param {string} key
* @param {function} callback
*/
Node.prototype.get = function(key, callback) {
  var self = this;

  this._log.debug('attempting to get value for key %s', key);

  this._storage.get(key, function(err, item) {
    if (!err && item) {
      return callback(null, JSON.parse(item).value);
    }

    self._router.findValue(key, function(err, value) {
      if (err) {
        return callback(err);
      }

      callback(null, value);
    });

  });
};

/**
* Setup event listeners for rpc messages
* #_bindRPCMessageHandlers
*/
Node.prototype._bindRPCMessageHandlers = function() {
  var self = this;

  this._rpc.on('PING', this._handlePing.bind(this));
  this._rpc.on('STORE', this._handleStore.bind(this));
  this._rpc.on('FIND_NODE', this._handleFindNode.bind(this));
  this._rpc.on('FIND_VALUE', this._handleFindValue.bind(this));
  this._rpc.on('CONTACT_SEEN', this._router.updateContact.bind(this._router));

  this._rpc.on('ready', function() {
    self._log.debug('node listening on %j', self._self.toString());
  });
};

/**
* Replicate local storage every T_REPLICATE
* #_startReplicationInterval
*/
Node.prototype._startReplicationInterval = function() {
  setInterval(this._replicate.bind(this), constants.T_REPLICATE);
};

/**
* Replicate local storage
* #_replicate
*/
Node.prototype._replicate = function() {
  var self = this;
  var stream = this._storage.createReadStream();

  this._log.info('starting local database replication');

  stream.on('data', function(data) {
    if (typeof data.value === 'string') {
      try {
        data.value = JSON.parse(data.value);
      } catch(err) {
        return self._log.error('failed to parse value from %s', data.value);
      }
    }

    // if we are not the publisher, then replicate every T_REPLICATE
    if (data.value.publisher !== self._self.nodeID) {
      self.put(data.key, data.value.value, function(err) {
        if (err) {
          self._log.error('failed to replicate item at key %s', data.key);
        }
      });
    // if we are the publisher, then only replicate every T_REPUBLISH
    } else if (Date.now() <= data.value.timestamp + constants.T_REPUBLISH) {
      self.put(data.key, data.value.value, function(err) {
        if (err) {
          self._log.error('failed to republish item at key %s', data.key);
        }
      });
    }
  });

  stream.on('error', function(err) {
    self._log.error('error while replicating: %s', err.message);
  });

  stream.on('end', function() {
    self._log.info('database replication complete');
  });
};

/**
* Expire entries older than T_EXPIRE
* #_startExpirationInterval
*/
Node.prototype._startExpirationInterval = function() {
  setInterval(this._expire.bind(this), constants.T_EXPIRE);
};

/**
* Expire entries older than T_EXPIRE
* #_expire
*/
Node.prototype._expire = function() {
  var self = this;
  var stream = this._storage.createReadStream();

  this._log.info('starting local database expiration');

  stream.on('data', function(data) {
    if (Date.now() <= data.value.timestamp + constants.T_EXPIRE) {
      self._storage.del(data.key, function(err) {
        if (err) {
          self._log.error('failed to expire item at key %s', data.key);
        }
      });
    }
  });

  stream.on('error', function(err) {
    self._log.error('error while expiring: %s', err.message);
  });

  stream.on('end', function() {
    self._log.info('database expiration complete');
  });
};

/**
* Handle `PING` RPC
* #_handlePing
* @param {object} incomingMsg
*/
Node.prototype._handlePing = function(incomingMsg) {
  var contact = this._rpc._createContact(incomingMsg.params.contact);
  var message = new Message({
    id: incomingMsg.id,
    result: { contact: this._self }
  });

  this._log.info(
    'received PING from %s, sending PONG',
    incomingMsg.params.contact.nodeID
  );
  this._rpc.send(contact, message);
};

/**
* Handle `STORE` RPC
* #_handleStore
* @param {object} incomingMsg
*/
Node.prototype._handleStore = function(incomingMsg) {
  var node = this;
  var params = incomingMsg.params;
  var item = params.item;

  try {
    item = new Item(item.key, item.value, params.contact.nodeID);
  } catch(err) {
    return this._log.error(
      'failed to store item at key %s, reason: %s',
      item.key,
      err.message
    );
  }

  this._log.info('received valid STORE from %s', params.contact.nodeID);

  this._validateKeyValuePair(item.key, item.value, function(valid) {
    if (!valid) {
      node._log.warn('failed to validate key/value pair for %s', item.key);
      return;
    }

    node._storeValidatedKeyValue(item, incomingMsg);
  });
};

/**
* Add the validated key/value to storage
* #_storeValidatedKeyValue
* @param {object} item
* @param {object} incomingMsg
*/
Node.prototype._storeValidatedKeyValue = function(item, incomingMsg) {
  var node = this;
  var params = incomingMsg.params;

  this._storage.put(item.key, JSON.stringify(item), function(err) {
    var contact = node._rpc._createContact(incomingMsg.params.contact);
    var message = new Message({
      error: err,
      result: { contact: node._self },
      id: incomingMsg.id
    });

    if (err) {
      node._log.debug('store failed, notifying %s', params.nodeID);
    } else {
      node._log.debug('successful store, notifying %s', params.nodeID);
    }

    node._rpc.send(contact, message);
  });
};

/**
* Handle `FIND_NODE` RPC
* #_handleFindNode
* @param {object} incomingMsg
*/
Node.prototype._handleFindNode = function(incomingMsg) {
  this._log.info('received FIND_NODE from %j', incomingMsg.params.contact);

  var node = this;
  var params = incomingMsg.params;
  var contact = this._rpc._createContact(params.contact);

  var near = this._router.getNearestContacts(
    params.key,
    constants.K,
    params.contact.nodeID
  );

  var message = new Message({
    id: incomingMsg.id,
    result: { nodes: near, contact: node._self }
  });

  this._log.debug(
    'sending %s nearest %d contacts',
    params.contact.nodeID,
    near.length
  );
  this._rpc.send(contact, message);
};

/**
* Handle `FIND_VALUE` RPC
* #_handleFindValue
* @param {object} incomingMsg
*/
Node.prototype._handleFindValue = function(incomingMsg) {
  var node = this;
  var params = incomingMsg.params;
  var contact = this._rpc._createContact(params.contact);
  var limit = constants.K;

  this._log.info('received valid FIND_VALUE from %s', params.contact.nodeID);
  this._storage.get(params.key, function(err, value) {
    if (err || !value) {
      node._log.debug(
        'value not found, sending contacts to %s',
        params.contact.nodeID
      );

      var notFoundMessage = new Message({
        id: incomingMsg.id,
        result: {
          nodes: node._router.getNearestContacts(
            params.key,
            limit,
            params.contact.nodeID
          ),
          contact: node._self
        }
      });

      return node._rpc.send(contact, notFoundMessage);
    }

    var parsed = JSON.parse(value);
    var item = new Item(
      parsed.key,
      parsed.value,
      parsed.publisher,
      parsed.timestamp
    );

    node._log.debug('found value, sending to %s', params.nodeID);

    var foundMessage = new Message({
      id: incomingMsg.id,
      result: { item: item, contact: node._self }
    });

    node._rpc.send(contact, foundMessage);
  });
};

/**
 * Validates the set storage adapter
 * #_setStorageAdapter
 * @param {object} storage
 */
Node.prototype._setStorageAdapter = function(storage) {
  assert(typeof storage === 'object', 'No storage adapter supplied');
  assert(typeof storage.get === 'function', 'Store has no `get` method');
  assert(typeof storage.put === 'function', 'Store has no `put` method');
  assert(typeof storage.del === 'function', 'Store has no `del` method');
  assert(
    typeof storage.createReadStream === 'function',
    'Store has no `createReadStream` method'
  );

  this._storage = storage;
};

module.exports = Node;
