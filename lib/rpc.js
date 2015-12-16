/**
* @module kad/rpc
*/

'use strict';

var inherits = require('util').inherits;
var events = require('events');
var assert = require('assert');
var hat = require('hat');
var merge = require('merge');
var constants = require('./constants');
var Contact = require('./contact');
var Message = require('./message');
var Logger = require('./logger');

/**
* Represents an RPC interface
* @constructor
* @param {object} options
*/
function RPC(options) {

  assert(this instanceof RPC, 'Invalid instance supplied');
  events.EventEmitter.call(this);

  this._createMessageID = hat.rack(constants.B);
  this._pendingCalls = {};
  this._contact = this._createContact(options.replyto || options);
  this._log = new Logger(options ? options.logLevel : 0);

  setInterval(this._expireCalls.bind(this), constants.T_RESPONSETIMEOUT + 5);
}

inherits(RPC, events.EventEmitter);

/**
* Send a RPC to the given contact
* #send
* @param {object} contact
* @param {object} message
* @param {function} callback
*/
RPC.prototype.send = function(contact, message, callback) {
  contact = this._createContact(contact);

  assert(contact instanceof Contact, 'Invalid contact supplied');
  assert(message instanceof Message, 'Invalid message supplied');

  merge(message.params, {
    rpcID: this._createMessageID()
  });

  var data = message.serialize();

  this._send(data, contact);

  if (typeof callback === 'function') {
    this._pendingCalls[message.params.rpcID] = {
      timestamp: Date.now(),
      callback: callback
    };
  }
};

/**
* Close the underlying socket
* #close
*/
RPC.prototype.close = function() {
  this._close();
};

/**
* Handle incoming messages
* #_handleMessage
* @param {buffer} buffer
* @param {object} info
*/
RPC.prototype._handleMessage = function(buffer, info) {
  var message;
  var data;
  var params;
  var contact;

  try {
    data = JSON.parse(buffer.toString('utf8'));
    params = data.params;
    contact = this._createContact(params);
    message = new Message(data.type, params, contact);
    this._log.debug('received valid message %j', message);
  } catch(err) {
    return this.emit('MESSAGE_DROP', buffer, info);
  }

  this._execPendingCallback(message, contact);
};

/**
 * Executes the pending callback for a given message
 * #_execPendingCallback
 * @param {object} message
 * @param {object} contact
 */
RPC.prototype._execPendingCallback = function(message, contact) {
  var referenceID = message.params.referenceID;
  var pendingCall = this._pendingCalls[referenceID];

  if (referenceID && pendingCall) {
    pendingCall.callback(null, message.params);
    delete this._pendingCalls[referenceID];
  } else {
    this.emit('CONTACT_SEEN', contact);
    this.emit(message.type, message.params);
  }
};

/**
* Expire RPCs that have not received a reply
* #_expireCalls
*/
RPC.prototype._expireCalls = function() {
  for (var rpcID in this._pendingCalls) {
    var pendingCall = this._pendingCalls[rpcID];
    var timePassed = Date.now() - pendingCall.timestamp;

    if (timePassed > constants.T_RESPONSETIMEOUT) {
      pendingCall.callback(new Error('RPC with ID `' + rpcID + '` timed out'));
      delete this._pendingCalls[rpcID];
    }
  }
};

/**
* Unimplemented stub, called on close()
* #_close
*/
RPC.prototype._close = function() {
  throw new Error('Method not implemented');
};

/**
* Unimplemented stub, called on send()
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
RPC.prototype._send = function() {
  throw new Error('Method not implemented');
};

/**
* Unimplemented stub, called in RPC()
* #_createContact
* @param {object} options
*/
RPC.prototype._createContact = function() {
  throw new Error('Method not implemented');
};

module.exports = RPC;
