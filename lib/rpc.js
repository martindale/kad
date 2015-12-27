/**
* @class kad/rpc
*/

'use strict';

var inherits = require('util').inherits;
var events = require('events');
var assert = require('assert');
var async = require('async');
var constants = require('./constants');
var Contact = require('./contact');
var Message = require('./message');
var Logger = require('./logger');

/**
* Represents an RPC interface
* @constructor
* @param {object} contact
* @param {object} options
*/
function RPC(contact, options) {
  assert(this instanceof RPC, 'Invalid instance supplied');
  assert(contact instanceof Contact, 'Invalid contact was supplied');

  events.EventEmitter.call(this);

  options = options || {};

  if (options.replyto) {
    assert(options.replyto instanceof Contact, 'Invalid contact was supplied');
  }

  this._hooks = { before: {}, after: {} };
  this._pendingCalls = {};
  this._contact = options.replyto || contact;
  this._log = (options && options.logger) || new Logger(0);

  this.open();
}

inherits(RPC, events.EventEmitter);

/**
* Open the underlying transport
* #open
*/
RPC.prototype.open = function() {
  var self = this;

  this._open(function() {
    self.emit('ready');
  });

  this._expirator = setInterval(
    this._expireCalls.bind(this),
    constants.T_RESPONSETIMEOUT + 5
  );
};

/**
* Close the underlying transport
* #close
*/
RPC.prototype.close = function() {
  this._close();
  clearInterval(this._expirator);
};

/**
* Send a RPC to the given contact
* #send
* @param {object} contact
* @param {object} message
* @param {function} callback
*/
RPC.prototype.send = function(contact, message, callback) {
  var self = this;

  contact = this._createContact(contact);

  assert(contact instanceof Contact, 'Invalid contact supplied');
  assert(message instanceof Message, 'Invalid message supplied');

  if (Message.isRequest(message)) {
    this._log.info('sending %s message to %j', message.method, contact);
  } else {
    this._log.info('replying to message to %s', message.id);
  }

  this._trigger('before:serialize', [message], function() {
    var serialized = message.serialize();

    self._trigger('after:serialize');
    self._trigger('before:send', [serialized, contact], function() {
      if (Message.isRequest(message) && typeof callback === 'function') {
        self._log.debug('queuing callback for reponse to %s', message.id);

        self._pendingCalls[message.id] = {
          timestamp: Date.now(),
          callback: callback
        };
      } else {
        self._log.debug('not waiting on callback for message %s', message.id);
      }

      self._send(message.serialize(), contact);
      self._trigger('after:send');
    });
  });
};

/**
* Handle incoming messages
* #receive
* @param {buffer} buffer
* @param {object} info
*/
RPC.prototype.receive = function(buffer, info) {
  var self = this, message, contact;

  this._trigger('before:deserialize', [buffer], function() {
    try {
      message = Message.fromBuffer(buffer);

      self._trigger('after:deserialize');

      if (Message.isRequest(message)) {
        contact = self._createContact(message.params.contact);
      } else {
        contact = self._createContact(message.result.contact);
      }

      self._log.info('received valid message %j', message);
    } catch(err) {
      self._log.error('failed to handle message, reason: %s', err.message);
      return self.emit('MESSAGE_DROP', buffer, info);
    }

    self._trigger('before:receive', [message, contact], function() {
      self._execPendingCallback(message, contact);
    });
  });
};

/**
 * Registers a "before" hook
 * #before
 * @param {string} event
 * @param {function} handler
 */
RPC.prototype.before = function(event, handler) {
  return this._register('before', event, handler);
};

/**
 * Registers an "after" hook
 * #after
 * @param {string} event
 * @param {function} handler
 */
RPC.prototype.after = function(event, handler) {
  return this._register('after', event, handler);
};

/**
 * Registers a middleware or "hook" in a set
 * #_register
 * @param {string} time - before|after
 * @param {string} event
 * @param {array} handler
 */
RPC.prototype._register = function(time, event, handler) {
  assert(Object.keys(this._hooks).indexOf(time) !== -1, 'Invalid hook');
  assert(typeof event === 'string', 'Invalid event supplied');
  assert(typeof handler === 'function', 'Invalid handler supplied');

  if (!this._hooks[time][event]) {
    this._hooks[time][event] = [];
  }

  this._hooks[time][event].push(handler);

  return this;
};

/**
 * Triggers a middleware or "hook" set
 * #_trigger
 * @param {string} event
 * @param {array} args
 * @param {function} complete
 */
RPC.prototype._trigger = function(event, args, complete) {
  var self = this;
  var hook = event.split(':')[0];
  var name = event.split(':')[1];
  var callback = complete || function() {};

  if (!this._hooks[hook][name]) {
    return callback();
  }

  var stack = this._hooks[hook][name].map(function(fn) {
    return fn.bind.apply(fn, [self].concat(args || []));
  });

  async.series(stack, function(err) {
    if (err) {
      return self.emit('error', err);
    }

    callback();
  });
};

/**
* Create a contact object from the supplied contact information
* #_createContact
* @param {object} options
*/
RPC.prototype._createContact = function(options) {
  return new this._contact.constructor(options);
};

/**
 * Executes the pending callback for a given message
 * #_execPendingCallback
 * @param {object} message
 * @param {object} contact
 */
RPC.prototype._execPendingCallback = function(message, contact) {
  var pendingCall = this._pendingCalls[message.id];

  this._log.debug('checking pending rpc callback stack for %s', message.id);

  if (Message.isResponse(message) && pendingCall) {
    pendingCall.callback(null, message);
    delete this._pendingCalls[message.id];
  } else if (Message.isRequest(message)) {
    assert(
      constants.MESSAGE_TYPES.indexOf(message.method) !== -1,
      'Message references invalid method "' + message.method + '"'
    );
    this.emit('CONTACT_SEEN', contact);
    this.emit(message.method, message);
  } else {
    this._log.warn('dropping received late response to %s', message.id);
  }

  this._trigger('after:receive', []);
};

/**
* Expire RPCs that have not received a reply
* #_expireCalls
*/
RPC.prototype._expireCalls = function() {
  this._log.debug('checking pending rpc callbacks for expirations');

  for (var rpcID in this._pendingCalls) {
    var pendingCall = this._pendingCalls[rpcID];
    var timePassed = Date.now() - pendingCall.timestamp;

    if (timePassed > constants.T_RESPONSETIMEOUT) {
      this._log.warn('rpc call %s timed out', rpcID);
      pendingCall.callback(new Error('RPC with ID `' + rpcID + '` timed out'));
      delete this._pendingCalls[rpcID];
    }
  }
};

/**
* Unimplemented stub, called on close()
* #_close
*/
RPC.prototype._close = function() {};

/**
* Unimplemented stub, called on send()
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
RPC.prototype._send = function() {};

/**
* Unimplemented stub, called on constructor
* #_open
* @param {function} done - callback
*/
RPC.prototype._open = function(done) {
  setImmediate(done);
};

module.exports = RPC;
