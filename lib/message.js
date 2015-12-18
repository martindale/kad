/**
* @module kad/message
*/

'use strict';

var constants = require('./constants');
var hat = require('hat');
var assert = require('assert');
var merge = require('merge');

/**
* Represents a message to be sent over RPC
* @constructor
* @param {object} spec
*/
function Message(spec) {
  if (!(this instanceof Message)) {
    return new Message(spec);
  }

  this.jsonrpc = '2.0';

  if (Message.isRequest(spec)) {
    assert(
      constants.MESSAGE_TYPES.indexOf(spec.method) !== -1,
      'Invalid message type'
    );

    this.id = spec.id || Message.createID();
    this.method = spec.method;
    this.params = spec.params;
  } else if (Message.isResponse(spec)) {
    this.id = spec.id;
    this.result = merge({}, spec.result);
    if (spec.error) {
      this.error = { code: -32603, message: spec.error };
    }
  } else {
    throw new Error('Invalid message specification');
  }
}

/**
* Serialize message to a Buffer
* #serialize
*/
Message.prototype.serialize = function() {
  return new Buffer(JSON.stringify(this), 'utf8');
};

/**
* Returns a boolean indicating if this message is a request
* #isRequest
*/
Message.isRequest = function(parsed) {
  return !!(parsed.method && parsed.params);
};

/**
* Returns a boolean indicating if this message is a response
* #isResponse
*/
Message.isResponse = function(parsed) {
  return !!(parsed.id && (parsed.result || parsed.error));
};

/**
* Create a Message instance from a buffer
* #fromBuffer
* @param {buffer} buffer
*/
Message.fromBuffer = function(buffer) {
  var parsed = JSON.parse(buffer.toString('utf8'));
  var message = new Message(parsed);

  return message;
};

/**
* Returns a message id
* #createID
*/
Message.createID = hat.rack(constants.B);

module.exports = Message;
