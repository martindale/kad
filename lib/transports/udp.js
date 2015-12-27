/**
* @module kad/transports/udp
*/

'use strict';

var AddressPortContact = require('../contacts/address-port-contact');
var inherits = require('util').inherits;
var assert = require('assert');
var dgram = require('dgram');
var RPC = require('../rpc');

/**
* Represents an UDP transport for RPC
* @constructor
* @param {object} contact
* @param {object} options
*/
function UDPTransport(contact, options) {
  if (!(this instanceof UDPTransport)) {
    return new UDPTransport(contact, options);
  }

  assert(contact instanceof AddressPortContact, 'Invalid contact supplied');
  RPC.call(this, contact, options);
}

inherits(UDPTransport, RPC);

/**
* Create a UDP socket
* #_open
* @param {function} done
*/
UDPTransport.prototype._open = function(done) {
  var self = this;

  this._socket = dgram.createSocket(
    { type: 'udp4', reuseAddr: true },
    this.receive.bind(this)
  );

  this._socket.on('error', function(err) {
    self._log.error('rpc encountered an error: %s', err.message);
  });

  this._socket.bind(this._contact.port, this._contact.address, done);
};

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
UDPTransport.prototype._send = function(data, contact) {
  this._socket.send(data, 0, data.length, contact.port, contact.address);
};

/**
* Close the underlying socket
* #_close
*/
UDPTransport.prototype._close = function() {
  this._socket.close();
};

module.exports = UDPTransport;
