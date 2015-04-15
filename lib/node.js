/**
* @module kademlia/node
*/

'use strict';

var assert = require('assert');
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
  this._buckets = {};
  this._rpc = new RPC(this._self);

  this._rpc.on('PING', this._handlePing.bind(this));
  this._rpc.on('STORE', this._handleStore.bind(this));
  this._rpc.on('FIND_NODE', this._handleFindNode.bind(this));
  this._rpc.on('FIND_VALUE', this._handleFindValue.bind(this));
}

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

  if (!hasValidKey) {
    return;
  }

  this._storage.get(params.key, function(err, value) {
    if (err || !value) {
      var notFoundMessage = new Message('FIND_VALUE_REPLY', {
        referenceID: params.rpcID,
        contacts: node._getNearestContacts(params.key, params.nodeID)
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
* @param {string} nodeID
*/
Node.prototype._getNearestContacts = function(key, nodeID) {

};
