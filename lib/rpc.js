/**
* @module kad/rpc
*/

'use strict';

var inherits = require('util').inherits;
var events = require('events');
var assert = require('assert');
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

  this._send(message.serialize(), contact);

  if (typeof callback === 'function') {
    this._pendingCalls[message.id] = {
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
  var message, contact;

  try {
    message = Message.fromBuffer(buffer);

    if (Message.isRequest(message)) {
      contact = this._createContact(message.params.contact);
    } else {
      contact = this._createContact(message.result.contact);
    }
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
  var pendingCall = this._pendingCalls[message.id];

  if (Message.isResponse(message) && pendingCall) {
    pendingCall.callback(null, message);
    delete this._pendingCalls[message.id];
  } else if (Message.isRequest(message)){
    this.emit('CONTACT_SEEN', contact);
    this.emit(message.method, message);
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
