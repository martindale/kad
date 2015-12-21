/**
 * @module kad/middleware/protocol
 */

'use strict';

var assert = require('assert');
var merge = require('merge');
var Message = require('../message');

/**
 * Factory for protocol extentions
 * #exports
 * @param {object} protocolspec - dictionary of methods
 */
module.exports = function ProtocolFactory(protocolspec) {
  assert(typeof protocolspec === 'object', 'Invalid protocol specification');

  return function protocol(message, contact, next) {
    var rpc = this;

    // if this is a response, just pass it along to execute callback
    if (Message.isResponse(message)) {
      return next();
    }

    // lookup the method defined in the protocol spec
    var method = protocolspec[message.method];

    // drop message if it break protocol
    if (typeof method !== 'function') {
      return next(new Error('Protocol does not define: ' + message.method));
    }

    // call the method and halt the middleware stack here
    method.call(rpc, message.params, function(err, result) {
      var reply = new Message({
        error: err,
        result:  merge({ contact: rpc._contact }, result),
        id: message.id
      });

      rpc.send(contact, reply);
    });
  };
};
