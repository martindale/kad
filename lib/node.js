/**
* @module kademlia/node
*/

'use strict';

var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var inherits = require('util').inherits;
var utils = require('./utils');
var events = require('events');
var dgram = require('dgram');
var constants = require('./constants');
var Bucket = require('./bucket');
var Contact = require('./contact');
var RPC = require('./rpc');

inherits(Node, events.EventEmitter);

/**
* Represents a Kademlia node
* @constructor
* @param {object} options
*/
function Node(options) {
  if (!(this instanceof Node)) {
    return new Node(options);
  }

  events.EventEmitter.call(this);

  this._storage = options.storage;

  assert(typeof this._storage === 'object', 'No storage adapter supplied');
  assert(typeof this._storage.get === 'function', 'Store has no `get` method');
  assert(typeof this._storage.set === 'function', 'Store has no `set` method');

  this._self = new Contact(options.address, options.port, options.nodeID);
  this._buckets = [];
  this._rpc = new RPC(this._self);

  this._rpc.on('PING', this._handlePing.bind(this));
  this._rpc.on('STORE', this._handleStore.bind(this));
  this._rpc.on('FIND_NODE', this._handleFindNode.bind(this));
  this._rpc.on('FIND_VALUE', this._handleFindValue.bind(this));
  this._rpc.on('CONTACT_SEEN', this._updateContact.bind(this));
}

/**
* Connects to the overlay network
* #connect
* @param {string} address
* @param {number} port
* @param {function} callback - optional
*/
Node.prototype.connect = function(address, port, callback) {
  if (callback) {
    this.once('ready', callback);
  }

  // TODO

  return this;
};

/**
* Set a key/value pair in the DHT
* #set
* @param {string} key
* @param {mixed} value
* @param {function} callback
*/
Node.prototype.set = function(key, value, callback) {
  var node = this;
  var params = { key: utils.createID(key), value: value };
  var message = new Message('STORE', params, this._self);

  this._findNode(params.key, function(err, contacts) {
    if (err) {
      return callback(err);
    }

    async.each(contacts, function(contact, done) {
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
  this._findValue(utils.createID(key), callback);
};

/**
* Search contacts for the value at given key
* #_findValue
* @param {string} key
* @param {function} callback
*/
Node.prototype._findValue = function(key, callback) {
  this._find(key, 'VALUE', function(err, type, value) {
    if (err || type === 'NODE') {
      return callback(new Error('Failed to find value for key: ' + key));
    }

    callback(null, value);
  });
};

/**
* Search contacts for nodes close to the given key
* #_findNode
* @param {string} nodeID
* @param {function} callback
*/
Node.prototype._findNode = function(nodeID, callback) {
  this._find(nodeID, 'NODE', function(err, type, contacts) {
    if (err) {
      return callback(err);
    }

    callback(null, contacts);
  });
};

/**
* Search contacts for nodes/values
* #_find
* @param {string} key
* @param {string} type - ['NODE', 'VALUE']
* @param {function} callback
*/
Node.prototype._find = function(key, type, callback) {
  assert(['NODE', 'VALUE'].indexOf(type) !== -1, 'Invalid search type');

  var node = this;
  var limit = constants.ALPHA;
  var shortlist = this._getNearestContacts(key, limit, this._self.nodeID);
  var closestNode = shortlist[0];
  var previousClosestNode = null;
  var contacted = {};
  var foundValue = false;
  var value = null;
  var contactsWithoutValue = [];

  if (!closestNode) {
    return callback(new Error('Not connected to any peers'));
  }

  var closestNodeDistance = utils.getDistance(key, closestNode.nodeID);
  var message = new Message('FIND_' + type, { key: key }, this._self.nodeID);

  execFind(shortlist);

  function execFind(contacts) {
    async.each(contacts, function(contact, done) {
      node._rpc.send(contact, message, function(err, params) {
        handleFindResult(err, params, contact, done);
      });
    }, function(err) {
      if (foundValue) {
        return handleValueReturned();
      }

      var closestNodeUnchanged = closestNode === previousClosestNode;
      var shortlistFull = shortlist.length >= constants.K;

      if (closestNodeUnchanged || shortlistFull) {
        return callback(null, 'NODE', shortlist);
      }

      var remainingContacts = _.reject(shortlist, function(c) {
        return contacted[c.nodeID];
      });

      if (remainingContacts.length === 0) {
        callback(null, 'NODE', shortlist);
      } else {
        execFind(_.first(remainingContacts, constants.ALPHA));
      }
    });
  }

  function handleFindResult(err, params, contact, done) {
    if (err) {
      shortlist = _.reject(shortlist, function(c) {
        return c.nodeID === contact.nodeID;
      });

      return done();
    }

    contacted[contact.nodeID] = this._updateContact(contact);

    var distance = utils.getDistance(key, contact.nodeID);

    if (utils.compareKeys(distance, closestNodeDistance) === -1) {
      previousClosestNode = closestNode;
      closestNode = contact;
      closestNodeDistance = distance;
    }

    if (type === 'VALUE' && params.value) {
      foundValue = true;
      value = params.value;
    } else {
      if (type === 'VALUE') {
        contactsWithoutValue.push(contact);
      }

      shortlist = shortlist.concat(params.contacts);
      shortlist = _.uniq(shortlist, false, function(contact) {
        return contact.nodeID;
      });
    }

    done();
  }

  function handleValueReturned() {
    // TODO
  }
};

/**
* Update the contact's lastSeen
* #_updateContact
* @param {object} contact
*/
Node.prototype._updateContact = function(contact) {
  // TODO

  return contact;
};

/**
* Handle `PING` RPC
* #_handlePing
* @param {object} params
*/
Node.prototype._handlePing = function(params) {
  var contact = new Contact(params.address, params.port, params.nodeID);
  var message = new Message('PONG', { referenceID: params.rpcID }, this._self);

  this._rpc.send(contact, message);
};

/**
* Handle `STORE` RPC
* #_handleStore
* @param {object} params
*/
Node.prototype._handleStore = function(params) {
  var node = this;
  var hasValidKey = utils.isValidKey(params.key);
  var hasValue = !!params.value;

  if (!hasValidKey || !hasValue) {
    return;
  }

  this._storage.set(params.key, message.value, function(err) {
    var contact = new Contact(params.address, params.port, params.nodeID);
    var message = new Message('STORE_REPLY', {
      referenceID: params.rpcID,
      success: !!err
    }, node._self);

    node._rpc.send(contact, message);
  });
};

/**
* Handle `FIND_NODE` RPC
* #_handleFindNode
* @param {object} params
*/
Node.prototype._handleFindNode = function(params) {
  var hasValidKey = utils.isValidKey(params.key);
  var contact = new Contact(params.address, params.port, params.nodeID);
  var message = new Message('FIND_NODE_REPLY', {
    referenceID: params.rpcID,
    contacts: this._getNearestContacts(params.key, params.nodeID)
  }, this._self);

  this._rpc.send(contact, message);
};

/**
* Handle `FIND_VALUE` RPC
* #_handleFindValue
* @param {object} params
*/
Node.prototype._handleFindValue = function(params) {
  var node = this;
  var hasValidKey = utils.isValidKey(params.key);
  var contact = new Contact(params.address, params.port, params.nodeID);
  var limit = constants.K;

  if (!hasValidKey) {
    return;
  }

  this._storage.get(params.key, function(err, value) {
    if (err || !value) {
      var notFoundMessage = new Message('FIND_VALUE_REPLY', {
        referenceID: params.rpcID,
        contacts: node._getNearestContacts(params.key, limit, params.nodeID)
      }, node._self);

      return node._rpc.send(contact, notFoundMessage);
    }

    var foundMessage = new Message('FIND_VALUE_REPLY', {
      referenceID: params.rpcID,
      value: value
    });

    node._rpc.send(contact, foundMessage);
  });
};

/**
* Return contacts closest to the given key
* #_getNearestContacts
* @param {string} key
* @param {number} limit
* @param {string} nodeID
*/
Node.prototype._getNearestContacts = function(key, limit, nodeID) {
  var contacts = [];
  var initialIndex = utils.getBucketIndex(this._self.nodeID, key);
  var ascBucketIndex = initialIndex;
  var descBucketIndex = initialIndex;

  if (this._buckets[initialIndex]) {
    addNearestFromBucket(this._buckets[initialIndex]);
  }

  while (contacts.length < limit && ascBucketIndex < constants.B) {
    ascBucketIndex++;

    if (this._buckets[ascBucketIndex]) {
      addNearestFromBucket(this._buckets[ascBucketIndex]);
    }
  }

  while (contacts.length < limit && descBucketIndex >= 0) {
    descBucketIndex--;

    if (this._buckets[descBucketIndex]) {
      addNearestFromBucket(this._buckets[descBucketIndex]);
    }
  }

  function addToContacts(contact) {
    var isContact = contact instanceof Contact;
    var poolNotFull = contacts.length < limit;
    var notRequester = contact.params.nodeID !== nodeID;

    if (isContact && poolNotFull && notRequester) {
      contacts.push(contact);
    }
  }

  function addNearestFromBucket(bucket) {
    var contactList = bucket.getContactList();
    var distances = contactList.map(addDistance).sort(sortKeysByDistance);
    var filtered = _.first(distances, limit - contacts.length);

    filtered.map(pluckContact).forEach(addToContacts);
  }

  function pluckContact(c) {
    return c.contact;
  }

  function sortKeysByDistance(a, b) {
    return utils.compareKeys(a.distance, b.distance);
  }

  function addDistance(contact) {
    return {
      contact: contact,
      distance: utils.getDistance(contact.params.nodeID, key)
    };
  }

  return contacts;
};
