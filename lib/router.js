/**
* @class kad/router
*/

'use strict';

var assert = require('assert');
var async = require('async');
var _ = require('lodash');
var constants = require('./constants');
var utils = require('./utils');
var Message = require('./message');
var Logger = require('./logger');
var Bucket = require('./bucket');
var Contact = require('./contact');

/**
* Represents a router for finding nodes and values
* @constructor
* @param {object} options
*/
function Router(options) {
  if (!(this instanceof Router)) {
    return new Router(options);
  }

  this._log = options.logger || new Logger(4);
  this._buckets = {};
  this._rpc = options.transport;
  this._self = this._rpc._contact;
  this._validator = options.validator;
}

/**
* Execute this router's find operation with the shortlist
* #lookup
* @param {string} type
* @param {string} key
* @param {function} callback
*/
Router.prototype.lookup = function(type, key, callback) {
  assert(['NODE', 'VALUE'].indexOf(type) !== -1, 'Invalid search type');

  var state = this._createLookupState(type, key);

  if (!state.closestNode) {
    return callback(new Error('Not connected to any peers'));
  }

  state.closestNodeDistance = utils.getDistance(
    state.hashedKey,
    state.closestNode.nodeID
  );

  this._log.debug('performing network walk for %s %s', type, key);
  this._iterativeFind(state, state.shortlist, callback);
};

/**
 * Creates a state machine for a lookup operation
 * #_createLookupState
 */
Router.prototype._createLookupState = function(type, key) {
  var state = {
    type: type,
    key: key,
    hashedKey: utils.createID(key),
    limit: constants.ALPHA,
    previousClosestNode: null,
    contacted: {},
    foundValue: false,
    value: null,
    contactsWithoutValue: []
  };
  state.shortlist = this.getNearestContacts(
    key,
    state.limit,
    this._self.nodeID
  );
  state.closestNode = state.shortlist[0];

  return state;
};


/**
* Execute the find operation for this router type
* #_iterativeFind
* @param {object} state
* @param {array} contacts
* @param {function} callback
*/
Router.prototype._iterativeFind = function(state, contacts, callback) {
  var self = this;

  this._log.debug('starting contact iteration for key %s', state.key);
  async.each(contacts, this._queryContact.bind(this, state), function() {
    self._log.debug('finished iteration, handling results');
    self._handleQueryResults(state, callback);
  });
};

/**
* Send this router's RPC message to the contact
* #_queryContact
* @param {object} state
* @param {object} contactInfo
* @param {function} callback
*/
Router.prototype._queryContact = function(state, contactInfo, callback) {
  var self = this;
  var contact = this._rpc._createContact(contactInfo);
  var message = new Message({
    method: 'FIND_' + state.type,
    params: { key: state.key, contact: this._self }
  });

  this._log.debug('querying %s for key %s', contact.nodeID, state.key);
  this._rpc.send(contact, message, function(err, response) {
    if (err) {
      self._log.error(
        'query failed, removing contact for shortlist, reason %s',
        err.message
      );
      self._removeFromShortList(state, contact.nodeID);
      return callback();
    }

    self._handleFindResult(state, response, contact, callback);
  });
};

/**
* Handle the results of the contact query
* #_handleFindResult
* @param {object} state
* @param {object} msg
* @param {object} contact
* @param {function} callback
*/
Router.prototype._handleFindResult = function(state, msg, contact, callback) {
  var distance = utils.getDistance(state.hashedKey, contact.nodeID);

  state.contacted[contact.nodeID] = this.updateContact(contact);

  if (utils.compareKeys(distance, state.closestNodeDistance) === -1) {
    state.previousClosestNode = state.closestNode;
    state.closestNode = contact;
    state.closestNodeDistance = distance;
  }

  if (state.type === 'NODE') {
    this._addToShortList(state, msg.result.nodes);
    return callback();
  }

  if (!msg.result.item) {
    state.contactsWithoutValue.push(contact);
    this._addToShortList(state, msg.result.nodes);
    return callback();
  }

  this._validateFindResult(state, msg, contact, callback);
};

/**
 * Validates the data returned from a find
 * #_validateFindResult
 * @param {object} state
 * @param {object} msg
 * @param {object} contact
 * @param {function} callback
 */
Router.prototype._validateFindResult = function(state, msg, contact, done) {
  var self = this;
  var item = msg.result.item;

  this._log.debug('validating result from %s', contact.nodeID);
  this._validateKeyValuePair(state.key, item.value, function(valid) {
    if (!valid) {
      self._log.warn('failed to validate key/value pair for %s', state.key);
      return rejectContact();
    }

    state.foundValue = true;
    state.value = item.value;
    done();
  });

  function rejectContact() {
    self._removeFromShortList(state, contact.nodeID);
    done();
  }
};

/**
* Add contacts to the shortlist, preserving nodeID uniqueness
* #_addToShortList
* @param {object} state
* @param {array} contacts
*/
Router.prototype._addToShortList = function(state, contacts) {
  assert(Array.isArray(contacts), 'No contacts supplied');
  state.shortlist = state.shortlist.concat(contacts);
  state.shortlist = _.uniq(state.shortlist, false, 'nodeID');
};

/**
* Remove contacts with the nodeID from the shortlist
* #_removeFromShortList
* @param {object} state
* @param {string} nodeID
*/
Router.prototype._removeFromShortList = function(state, nodeID) {
  state.shortlist = _.reject(state.shortlist, function(c) {
    return c.nodeID === nodeID;
  });
};

/**
* Handle the results of all the executed queries
* #_handleQueryResults
* @param {object} state
* @param {function} callback
*/
Router.prototype._handleQueryResults = function(state, callback) {
  if (state.foundValue) {
    this._log.debug('a value was returned from query %s', state.key);
    return this._handleValueReturned(state, callback);
  }

  var closestNodeUnchanged = state.closestNode === state.previousClosestNode;
  var shortlistFull = state.shortlist.length >= constants.K;

  if (closestNodeUnchanged || shortlistFull) {
    this._log.debug(
      'shortlist is full or there are no known nodes closer to key %s',
      state.key
    );
    return callback(null, 'NODE', state.shortlist);
  }

  var remainingContacts = _.reject(state.shortlist, function(c) {
    return state.contacted[c.nodeID];
  });

  if (remainingContacts.length === 0) {
    this._log.debug('there are no more remaining contacts to query');
    return callback(null, 'NODE', state.shortlist);
  }

  this._log.debug('continuing with iterative query for key %s', state.key);
  this._iterativeFind(
    state,
    remainingContacts.splice(0, constants.ALPHA),
    callback
  );
};

/**
* Handle a value being returned and store at closest nodes that didn't have it
* #_handleValueReturned
* @param {object} state
* @param {function} callback
*/
Router.prototype._handleValueReturned = function(state, callback) {
  var self = this;

  var distances = state.contactsWithoutValue.map(function(contact) {
    return {
      distance: utils.getDistance(contact.nodeID, self._self.nodeID),
      contact: contact
    };
  });

  distances.sort(function(a, b) {
    return utils.compareKeys(a.distance, b.distance);
  });

  if (distances.length >= 1) {
    var closestWithoutValue = distances[0].contact;
    var message = new Message({
      method: 'STORE',
      params: { item: JSON.parse(state.value), contact: this._self}
    });

    this._rpc.send(closestWithoutValue, message);
  }

  callback(null, 'VALUE', state.value);
};

/**
* Refreshes the buckets farther than the closest known
* #refreshBucketsBeyondClosest
* @param {array} contacts
* @param {function} done
*/
Router.prototype.refreshBucketsBeyondClosest = function(contacts, done) {
  var bucketIndexes = Object.keys(this._buckets);
  var leastBucket = _.min(bucketIndexes);

  function bucketFilter(index) {
    return index >= leastBucket;
  }

  var refreshBuckets = bucketIndexes.filter(bucketFilter);
  var queue = async.queue(this.refreshBucket.bind(this), 1);

  this._log.debug('refreshing buckets farthest than closest known');

  refreshBuckets.forEach(function(index) {
    queue.push(index);
  });

  done();
};

/**
* Refreshes the bucket at the given index
* #refreshBucket
* @param {number} index
* @param {function} callback
*/
Router.prototype.refreshBucket = function(index, callback) {
  var random = utils.getRandomInBucketRangeBuffer(index);
  this.findNode(random.toString('hex'), callback);
};

/**
* Search contacts for the value at given key
* #findValue
* @param {string} key
* @param {function} callback
*/
Router.prototype.findValue = function(key, callback) {
  var self = this;

  this._log.debug('searching for value at key %s', key);

  this.lookup('VALUE', key, function(err, type, value) {
    if (err || type === 'NODE') {
      return callback(new Error('Failed to find value for key: ' + key));
    }

    self._log.debug('found value for key %s', key);

    callback(null, value);
  });
};

/**
* Search contacts for nodes close to the given key
* #findNode
* @param {string} nodeID
* @param {function} callback
*/
Router.prototype.findNode = function(nodeID, callback) {
  var self = this;

  this._log.debug('searching for nodes close to key %s', nodeID);

  this.lookup('NODE', nodeID, function(err, type, contacts) {
    if (err) {
      return callback(err);
    }

    self._log.debug('found %d nodes close to key %s', contacts.length, nodeID);
    callback(null, contacts);
  });
};

/**
* Update the contact's status
* #updateContact
* @param {object} contact
* @param {function} callback - optional
*/
Router.prototype.updateContact = function(contact, callback) {
  var bucketIndex = utils.getBucketIndex(this._self.nodeID, contact.nodeID);

  this._log.debug('updating contact %j', contact);
  assert(bucketIndex < constants.B);

  if (!this._buckets[bucketIndex]) {
    this._log.debug('creating new bucket for contact at index %d', bucketIndex);
    this._buckets[bucketIndex] = new Bucket();
  }

  var bucket = this._buckets[bucketIndex];

  contact.seen();

  if (bucket.hasContact(contact.nodeID)) {
    this._moveContactToTail(contact, bucket, callback);
  } else if (bucket.getSize() < constants.K) {
    this._moveContactToHead(contact, bucket, callback);
  } else {
    this._pingContactAtHead(contact, bucket, callback);
  }

  return contact;
};

/**
* Move the contact to the bucket's tail
* #_moveContactToTail
* @param {object} contact
* @param {object} bucket
* @param {function} callback - optional
*/
Router.prototype._moveContactToTail = function(contact, bucket, callback) {
  this._log.debug('contact already in bucket, moving to tail');
  bucket.removeContact(contact);
  bucket.addContact(contact);

  if (callback) {
    callback();
  }
};

/**
* Move the contact to the bucket's head
* #_moveContactToHead
* @param {object} contact
* @param {object} bucket
* @param {function} callback - optional
*/
Router.prototype._moveContactToHead = function(contact, bucket, callback) {
  this._log.debug('contact not in bucket, moving to head');
  bucket.addContact(contact);

  if (callback) {
    callback();
  }
};

/**
* Ping the contact at head and if no response, replace with contact
* #_pingContactAtHead
* @param {object} contact
* @param {object} bucket
* @param {function} callback - optional
*/
Router.prototype._pingContactAtHead = function(contact, bucket, callback) {
  var self = this;
  var ping = new Message({ method: 'PING', params: { contact: this._self } });
  var head = bucket.getContact(0);

  this._log.debug('no room in bucket, sending PING to contact at head');
  this._rpc.send(head, ping, function(err) {
    if (err) {
      self._log.debug('head contact did not respond, replacing with new');
      bucket.removeContact(head);
      bucket.addContact(contact);
    }

    if (callback) {
      callback();
    }
  });
};

/**
* Return contacts closest to the given key
* #_getNearestContacts
* @param {string} key
* @param {number} limit
* @param {string} nodeID
*/
Router.prototype.getNearestContacts = function(key, limit, nodeID) {
  var self = this;
  var contacts = [];
  var index = utils.getBucketIndex(this._self.nodeID, utils.createID(key));
  var ascBucketIndex = index;
  var descBucketIndex = index;

  function addNearestFromBucket(bucket) {
    self._getNearestFromBucket(
      bucket,
      utils.createID(key),
      limit - contacts.length
    ).forEach(function addToContacts(contact) {
      var isContact = contact instanceof Contact;
      var poolNotFull = contacts.length < limit;
      var notRequester = contact.nodeID !== nodeID;

      if (isContact && poolNotFull && notRequester) {
        contacts.push(contact);
      }
    });
  }

  addNearestFromBucket(this._buckets[index]);

  while (contacts.length < limit && ascBucketIndex < constants.B) {
    ascBucketIndex++;
    addNearestFromBucket(this._buckets[ascBucketIndex]);
  }

  while (contacts.length < limit && descBucketIndex >= 0) {
    descBucketIndex--;
    addNearestFromBucket(this._buckets[descBucketIndex]);
  }

  return contacts;
};

/**
 * Get the contacts closest to the key from the given bucket
 * #_getNearestFromBucket
 * @param {object} bucket
 * @param {string} key
 * @param {number} limit
 */
Router.prototype._getNearestFromBucket = function(bucket, key, limit) {
  if (!bucket) {
    return [];
  }

  var nearest = bucket.getContactList().map(function addDistance(contact) {
    return {
      contact: contact,
      distance: utils.getDistance(contact.nodeID, key)
    };
  }).sort(function sortKeysByDistance(a, b) {
    return utils.compareKeys(a.distance, b.distance);
  }).splice(0, limit).map(function pluckContact(c) {
    return c.contact;
  });

  return nearest;
};

/**
 * Validates a key/value pair (defaults to true)
 * #_validateKeyValuePair
 * @param {string} key
 * @param {string} value
 * @param {function} callback
 */
Router.prototype._validateKeyValuePair = function(key, value, callback) {
  if (typeof this._validator === 'function') {
    return this._validator(key, value, callback);
  }

  callback(true);
};

module.exports = Router;
