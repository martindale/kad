/**
* @module kad/transports/udp
*/

'use strict';

var inherits = require('util').inherits;
var dgram = require('dgram');
var RPC = require('../rpc');

inherits(UDPTransport, RPC);

/**
* Represents an UDP transport for RPC
* @constructor
* @param {object} contact
*/
function UDPTransport(contact, options) {
  if (!(this instanceof UDPTransport)) {
    return new UDPTransport(contact, options);
  }

  var self = this;

  RPC.call(this, contact, options);

  this._socket = dgram.createSocket('udp4', this._handleMessage.bind(this));

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
}

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {number} port
* @param {string} address
*/
UDPTransport.prototype._send = function(data, port, address) {
  this._socket.send(data, 0, data.length, port, address);
};

/**
* Close the underlying socket
* #_close
*/
UDPTransport.prototype._close = function() {
  this._socket.close();
};

module.exports = UDPTransport;
