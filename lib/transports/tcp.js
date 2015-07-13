/**
* @module kad/transports/tcp
*/

'use strict';

var inherits = require('util').inherits;
var clarinet = require('clarinet');
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
  var self = this;
  var sock = this._connections[address + ':' + port];

  if (!sock) {
    sock = net.createConnection(port, address);
    this._connections[address + ':' + port] = sock;

    sock.on('error', function(err) {
      self._log.error('error connecting to peer', err);
    });
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
  var parser = clarinet.createStream();
  var buffer = '';
  var opened = 0;
  var closed = 0;

  this._log.info('connection opened with %s:%s', addr, port);

  this._connections[addr + ':' + port] = socket;

  parser.on('openobject', function(key) {
    opened++;
  });

  parser.on('closeobject', function() {
    closed++;

    if (opened === closed) {
      self._handleMessage(new Buffer(buffer), { address: addr, port: port });

      buffer = '';
      opened = 0;
      closed = 0;
    }
  });

  parser.on('error', function(err) {
    socket.close();
  });

  socket.on('data', function(data) {
    buffer += data.toString('utf8');
    parser.write(data.toString('utf8'));
  });

  socket.on('close', function() {
    delete self._connections[addr + ':' + port];
  });

  socket.on('error', function(err) {
    delete self._connections[addr + ':' + port];
  });
};

module.exports = TCPTransport;
