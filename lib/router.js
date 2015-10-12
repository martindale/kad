/**
* @module kad/router
*/

'use strict';

var assert = require('assert');
var async = require('async');
var _ = require('lodash');
var constants = require('./constants');
var Node = require('./node');
var utils = require('./utils');
var Message = require('./message');
var Contact = require('./contact');

/**
* Represents a router for finding nodes and values
* @constructor
* @param {string} type - ['NODE','VALUE']
* @param {string} key - key to find close nodes/value
* @param {object} node - the node executing the route
*/
function Router(type, key, node) {
  if (!(this instanceof Router)) {
    return new Router(type, key, node);
  }

  assert(['NODE', 'VALUE'].indexOf(type) !== -1, 'Invalid search type');
//  assert(node instanceof Node, 'Invalid node supplied');

  this.node = node;
  this.type = type;
  this.key = key;

  this.limit = constants.ALPHA;
  this.shortlist = node._getNearestContacts(key, this.limit, node._self.nodeID);
  this.closestNode = this.shortlist[0];
  this.previousClosestNode = null;
  this.contacted = {};
  this.foundValue = false;
  this.value = null;
  this.contactsWithoutValue = [];
}

/**
* Execute this router's find operation with the shortlist
* #route
* @param {function} callback
*/
Router.prototype.route = function(callback) {
  if (!this.closestNode) {
    return callback(new Error('Not connected to any peers'));
  }

  this.closestNodeDistance = utils.getDistance(
    this.key,
    this.closestNode.nodeID
  );

  this.message = new Message('FIND_' + this.type, {
    key: this.key
  }, this.node._self);

  this._iterativeFind(this.shortlist, callback);
};

/**
* Execute the find operation for this router type
* #iterativeFind
* @param {array} contacts
* @param {function} callback
*/
Router.prototype._iterativeFind = function(contacts, callback) {
  var self = this;

  async.each(contacts, this._queryContact.bind(this), function(err) {
    self._handleQueryResults(callback);
  });
};

/**
* Send this router's RPC message to the contact
* #_queryContact
* @param {object} contactInfo
* @param {function} callback
*/
Router.prototype._queryContact = function(contactInfo, callback) {
  var self = this;
  var contact = this.node._rpc._createContact(contactInfo);

  this.node._rpc.send(contact, this.message, function(err, params) {
    if (err) {
      self.shortlist = _.reject(self.shortlist, function(c) {
        return c.nodeID === contact.nodeID;
      });

      return callback();
    }

    self._handleFindResult(params, contact, callback);
  });
};

/**
* Handle the results of the contact query
* #_handleFindResult
* @param {object} params - message response params
* @param {object} contact
* @param {function} callback
*/
Router.prototype._handleFindResult = function(params, contact, done) {
  var distance = utils.getDistance(this.key, contact.nodeID);

  this.contacted[contact.nodeID] = this.node._updateContact(contact);

  if (utils.compareKeys(distance, this.closestNodeDistance) === -1) {
    this.previousClosestNode = this.closestNode;
    this.closestNode = contact;
    this.closestNodeDistance = distance;
  }

  if (this.type === 'VALUE') {
    if (params.value) {
      this.foundValue = true;
      this.value = params.value;

      return done();
    } else {
      this.contactsWithoutValue.push(contact);
    }
  }

  assert(Array.isArray(params.contacts), 'No contacts included in params');

  this.shortlist = this.shortlist.concat(params.contacts);
  this.shortlist = _.uniq(this.shortlist, false, function(contact) {
    return contact.nodeID;
  });

  done();
};

/**
* Handle the results of all the executed queries
* #_handleQueryResults
* @param {function} callback
*/
Router.prototype._handleQueryResults = function(callback) {
  var self = this;

  if (this.foundValue) {
    return this._handleValueReturned(callback);
  }

  var closestNodeUnchanged = this.closestNode === this.previousClosestNode;
  var shortlistFull = this.shortlist.length >= constants.K;

  if (closestNodeUnchanged || shortlistFull) {
    return callback(null, 'NODE', this.shortlist);
  }

  var remainingContacts = _.reject(this.shortlist, function(c) {
    return self.contacted[c.nodeID];
  });

  if (remainingContacts.length === 0) {
    callback(null, 'NODE', this.shortlist);
  } else {
    this._iterativeFind(remainingContacts.splice(0, constants.ALPHA), callback);
  }
};

/**
* Handle a value being returned and store at closest nodes that didn't have it
* #_handleValueReturned
* @param {function} callback
*/
Router.prototype._handleValueReturned = function(callback) {
  var self = this;

  var distances = this.contactsWithoutValue.map(function(contact) {
    return {
      distance: utils.getDistance(contact.nodeID, self.node._self.nodeID),
      contact: contact
    };
  });

  distances.sort(function(a, b) {
    return utils.compareKeys(a.distance, b.distance);
  });

  if (distances.length >= 1) {
    var closestWithoutValue = distances[0].contact;
    var message = new Message('STORE', {
      key: self.key,
      value: self.value
    }, this.node._self);

    this.node._rpc.send(closestWithoutValue, message);
  }

  callback(null, 'VALUE', self.value);
};

module.exports = Router;
