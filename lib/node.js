/**
* @module kademlia/node
*/

'use strict';

var assert = require('assert');
var util = require('util');
var events = require('events');
var dgram = require('dgram');
var constants = require('./constants');
var Bucket = require('./bucket');
var Contact = require('./contact');
var RPC = require('./rpc');

util.inherits(Node, events.EventEmitter);

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

};

/**
* Handle `FIND_NODE` RPC
* #_handleFindNode
* @param {object} params
*/
Node.prototype._handleFindNode = function(params) {

};

/**
* Handle `FIND_VALUE` RPC
* #_handleFindValue
* @param {object} params
*/
Node.prototype._handleFindValue = function(params) {

};
