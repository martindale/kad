/**
* @module kad/examples/webrtc-browser-e2e/SignalClient
*/

'use strict';

var EventEmitter = require('events').EventEmitter;
var webSocket = require('./web-socket');
var inherits = require('util').inherits;

inherits(SignalClient, EventEmitter);

/**
* A client for talking to the signal server.
* @param {string} nick
* @constructor
*/
function SignalClient(nick) {
  var signalClient = this;

  webSocket.on('open', function() {
    webSocket.send(JSON.stringify({ announceNick: nick }));
  });

  webSocket.on('message', function(message) {
    var parsed = JSON.parse(message);
    if(nick !== parsed.sender) {
      EventEmitter.prototype.emit.call(signalClient, nick, parsed);
    }
  });
}

/**
* Send a signal to the signal server to perform a WebRTC handshake
* @param {string} recipient
* @param {string} message
*/
SignalClient.prototype.emit = function(recipient, message) {
  webSocket.send(JSON.stringify({ recipient: recipient, message: message }));
};

module.exports = SignalClient;
