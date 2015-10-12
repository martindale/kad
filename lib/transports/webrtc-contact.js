/**
* @module kad/peer-contact
*/

'use strict';

var assert = require('assert');
var Contact = require('../contact.js');
var inherits = require('util').inherits;
var utils = require('../utils');

inherits(WebRTCContact, Contact);

/**
* Represent a WebRTC contact
* @constructor
* @param {object} options
*/
function WebRTCContact(options) {
  if (!(this instanceof WebRTCContact)) {
    return new WebRTCContact(options);
  }

  assert(options instanceof Object, 'Invalid options were supplied');
  assert(typeof options.nick === 'string', 'Invalid nick was supplied');

  this.nick = options.nick;

  Contact.call(this, options);
}

/**
* Generate a NodeID by taking the SHA1 hash of the nickname
* #_createNodeID
*/
WebRTCContact.prototype._createNodeID = function() {
  return utils.createID(this.nick);
};

/**
* Generate a user-friendly string for the contact
* #_toString
*/
WebRTCContact.prototype.toString = function() {
  return this.nick;
};

module.exports = WebRTCContact;
