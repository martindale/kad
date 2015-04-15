/**
* @module kad/contact
*/

'use strict';

var assert = require('assert');
var crypto = require('crypto');
var utils = require('./utils');
var constants = require('./constants');

/**
* Represent a contact (or peer)
* @constructor
* @param {string} address
* @param {number} port
* @param {string} nodeID
*/
function Contact(address, port, nodeID) {
  if (!(this instanceof Contact)) {
    return new Contact(address, port, nodeID);
  }

  assert(typeof address === 'string', 'Invalid address was supplied');
  assert(typeof port === 'number', 'Invalid port was supplied');

  this.address = address;
  this.port = port;

  Object.defineProperty(this, 'nodeID', {
    value: nodeID || this._createNodeID(),
    configurable: false
  });

  assert(utils.isValidKey(this.nodeID), 'Invalid nodeID was supplied');

  this.seen();
}

/**
* Updates the lastSeen property to right now
* #seen
*/
Contact.prototype.seen = function() {
  this.lastSeen = Date.now();
};

/**
* Generate a NodeID by taking the SHA1 hash of the address and port
* #_createNodeID
*/
Contact.prototype._createNodeID = function() {
  var hash = crypto.createHash('sha1');
  var data = this.address + ':' + this.port;

  return hash.update(data).digest('hex');
};

module.exports = Contact;
