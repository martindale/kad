/**
* @module kad/transports/tcp
*/

'use strict';

var assert = require('assert');
var inherits = require('util').inherits;
var clarinet = require('clarinet');
var net = require('net');
var AddressPortContact = require('../contacts/address-port-contact');
var RPC = require('../rpc');

/**
* Represents an RPC interface over TCP
* @constructor
* @param {object} contact
* @param {object} options
*/
function TCPTransport(contact, options) {
  if (!(this instanceof TCPTransport)) {
    return new TCPTransport(contact, options);
  }

  assert(contact instanceof AddressPortContact, 'Invalid contact supplied');
  RPC.call(this, contact, options);
}

inherits(TCPTransport, RPC);

/**
* Create a TCP server
* #_open
* @param {function} done
*/
TCPTransport.prototype._open = function(done) {
  var self = this;

  this._socket = net.createServer(this._handleConnection.bind(this));
  this._queuedResponses = {};

  this._socket.on('error', function(err) {
    self._log.error('rpc encountered and error: %s', err.message);
  });

  this._socket.on('listening', done);
  this._socket.listen(this._contact.port, this._contact.address);
};

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
TCPTransport.prototype._send = function(data, contact) {
  var self = this;
  var parsed = JSON.parse(data.toString());

  if (this._queuedResponses[parsed.id]) {
    this._queuedResponses[parsed.id].end(data);
    delete this._queuedResponses[parsed.id];
    return;
  }

  var sock = net.createConnection(contact.port, contact.address);

  sock.on('error', function(err) {
    self._log.error('error connecting to peer', err);
  });

  this._queuedResponses[parsed.id] = sock;

  this._handleConnection(sock);
  sock.write(data);
};

/**
* Close the underlying socket
* #_close
*/
TCPTransport.prototype._close = function() {
  this._socket.close();
};

/**
* Handle incoming connection
* #_handleConnection
* @param {object} socket
*/
TCPTransport.prototype._handleConnection = function(socket) {
  var self = this;
  var addr = socket.remoteAddress;
  var port = socket.remotePort;
  var parser = clarinet.createStream();
  var buffer = '';
  var opened = 0;
  var closed = 0;

  this._log.info('connection opened with %s:%s', addr, port);

  parser.on('openobject', function() {
    opened++;
  });

  parser.on('closeobject', function() {
    closed++;

    if (opened === closed) {
      try {
        var parsed = JSON.parse(buffer);

        if (parsed.id && !self._queuedResponses[parsed.id]) {
          self._queuedResponses[parsed.id] = socket;
        }
      } catch(err) {
        // noop
      }

      self.receive(new Buffer(buffer), { address: addr, port: port });

      buffer = '';
      opened = 0;
      closed = 0;
    }
  });

  parser.on('error', function(err) {
    self._log.error(err.message);
    self._log.warn('failed to parse incoming message');
    socket.close();
  });

  socket.on('error', function(err) {
    self._log.error(err.message);
    self._log.warn('error communicating with peer %s:%s', addr, port);
  });

  socket.on('data', function(data) {
    buffer += data.toString('utf8');
    parser.write(data.toString('utf8'));
  });
};

module.exports = TCPTransport;
