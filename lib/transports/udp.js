/**
* @module kad/transports/udp
*/

'use strict';

var inherits = require('util').inherits;
var events = require('events');
var assert = require('assert');
var dgram = require('dgram');
var hat = require('hat');
var merge = require('merge');
var constants = require('../constants');
var Contact = require('../contact');
var Message = require('../message');
var Logger = require('../logger');

inherits(RPC, events.EventEmitter);

/**
* Represents an RPC interface
* @constructor
* @param {object} contact
*/
function RPC(contact, options) {
  if (!(this instanceof RPC)) {
    return new RPC(contact, options);
  }

  var self = this;

  assert(contact instanceof Contact, 'Invalid contact supplied');
  events.EventEmitter.call(this);

  this._socket = dgram.createSocket('udp4', this._handleMessage.bind(this));
  this._createMessageID = hat.rack(constants.B);
  this._pendingCalls = {};
  this._contact = contact;
  this._log = new Logger(options ? options.logLevel : 0);

  this._socket.on('error', function(err) {
    self._log.warn('failed to bind to supplied address %s', contact.address);
    self._log.info('binding to all interfaces as a fallback');
    self._socket.close();

    self._socket = dgram.createSocket('udp4', self._handleMessage.bind(self));

    self._socket.bind(contact.port);
  });

  this._socket.on('listening', function() {
    self.emit('ready');
  });

  this._socket.bind(contact.port, contact.address);
  setInterval(this._expireCalls.bind(this), constants.T_RESPONSETIMEOUT + 5);
}

/**
* Send a RPC to the given contact
* #send
* @param {object} contact
* @param {object} message
* @param {function} callback
*/
RPC.prototype.send = function(contact, message, callback) {
  assert(contact instanceof Contact, 'Invalid contact supplied');
  assert(message instanceof Message, 'Invalid message supplied');

  merge(message.params, {
    rpcID: this._createMessageID()
  });

  var data = message.serialize();
  var offset = 0;

  this._socket.send(data, offset, data.length, contact.port, contact.address);

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
  this._socket.close();
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
    contact = new Contact(params.address, params.port, params.nodeID);
    message = new Message(data.type, params, contact);
    this._log.debug('received valid message %j', message);
  } catch(err) {
    return this.emit('MESSAGE_DROP', buffer, info);
  }

  var referenceID = message.params.referenceID;
  var pendingCall = this._pendingCalls[referenceID];

  if (referenceID && pendingCall) {
    pendingCall.callback(null, message.params);

    return delete this._pendingCalls[referenceID];
  }

  this.emit('CONTACT_SEEN', contact);
  this.emit(message.type, message.params);
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

module.exports = RPC;
