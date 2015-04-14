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

  this.self = new Contact(options.address, options.port, options.nodeID);
}
