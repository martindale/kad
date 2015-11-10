/**
* @module kad/transports/http
*/

'use strict';

var AddressPortContact = require('../contacts/address-port-contact');
var inherits = require('util').inherits;
var http = require('http');
var RPC = require('../rpc');

inherits(HTTPTransport, RPC);

/**
* Represents an HTTP transport for RPC
* @constructor
* @param {object} options
*/
function HTTPTransport(options) {
  if (!(this instanceof HTTPTransport)) {
    return new HTTPTransport(options);
  }

  RPC.call(this, options);

  var self = this;

  this._server = http.createServer(function(req, res) {
    var payload = '';

    req.on('data', function(chunk) {
      payload += chunk.toString();
    });

    req.on('end', function() {
      self._handleMessage(new Buffer(payload), {});
    });
  });

  this._server.listen(this._contact.port, this._contact.address, function() {
    self.emit('ready');
  });
}

/**
* Create a HTTP Contact
* #_createContact
* @param {object} options
*/
HTTPTransport.prototype._createContact = function(options) {
  return new AddressPortContact(options);
}

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
HTTPTransport.prototype._send = function(data, contact) {
  var self = this;
  var options = {
    hostname: contact.address,
    port: contact.port,
    method: 'POST'
  };
  var req = http.request(options, handleResponse);

  function handleResponse(res) {
    var payload = '';

    res.on('data', function(chunk) {
      payload += chunk.toString();
    });

    res.on('end', function() {
      self._handleMessage(new Buffer(payload), {});
    });
  }

  req.on('error', function(err) {
    self._handleMessage(null);
  });

  req.end(data);
};

/**
* Close the underlying socket
* #_close
*/
HTTPTransport.prototype._close = function() {
  this._server.close();
};

module.exports = HTTPTransport;
