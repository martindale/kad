/**
* @module kad/transports/tcp
*/

'use strict';

var inherits = require('util').inherits;
var net = require('net');
var RPC = require('../rpc');

inherits(TCPTransport, RPC);

/**
* Represents an RPC interface over TCP
* @constructor
* @param {object} contact
*/
function TCPTransport(contact, options) {
  if (!(this instanceof TCPTransport)) {
    return new TCPTransport(contact, options);
  }

  var self = this;

  RPC.call(this, contact, options);

  this._connections = {};
  this._socket = net.createServer(this._handleConnection.bind(this));

  this._socket.on('error', function(err) {
    self._log.warn('failed to bind to supplied address %s', contact.address);
    self._log.info('binding to all interfaces as a fallback');
    self._socket.close();

    self._socket = net.createServer(self._handleConnection.bind(self));

    self._socket.listen(contact.port);
  });

  this._socket.on('listening', function() {
    self.emit('ready');
  });

  this._socket.listen(contact.port, contact.address);
}

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {number} port
* @param {string} address
*/
TCPTransport.prototype._send = function(data, port, address) {
  var sock = this._connections[address + ':' + port];

  if (!sock) {
    sock = net.createConnection(port, address);
    this._connections[address + ':' + port] = sock;
  }

  sock.write(data);
};

/**
* Close the underlying socket
* #_close
*/
TCPTransport.prototype._close = function() {
  this._socket.close();

  for (var contact in this._connections) {
    this._connections[contact].destroy();
  }

  this._connections = {};
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

  this._connections[addr + ':' + port] = socket;

  socket.on('data', this._handleMessage.bind(this));

  socket.on('close', function() {
    delete self._connections[addr + ':' + port];
  });

  socket.on('error', function(err) {
    delete self._connections[addr + ':' + port];
  });
};

module.exports = TCPTransport;
