/**
* @module kad/transports/webrtc
*/

'use strict';

var assert = require('assert');
var hat = require('hat');
var inherits = require('util').inherits;
var WebRTCContact = require('./webrtc-contact');
var RPC = require('../rpc');
var SimplePeer = require('simple-peer');

inherits(WebRTCTransport, RPC);

/**
* Represents an RPC interface over WebRTC
* @constructor
* @param {object} options
*/
function WebRTCTransport(options) {
  if (!(this instanceof WebRTCTransport)) {
    return new WebRTCTransport(options);
  }

  assert(options instanceof Object, 'Invalid options were supplied');
  assert(options.signaller instanceof Object, 'Invalid signaller was supplied');

  var self = this

  RPC.call(this, options);

  this._peers = {};
  this._wrtc = options.wrtc;
  this._signaller = options.signaller;
  this._signalHandler = this._onSignal.bind(this);
  this._signaller.addListener(this._contact.nick, this._signalHandler)

  setTimeout(this.emit.bind(this, 'ready'));
}

/**
* Handle a message sent through `_signaller` from another peer
* #_onSignal
* @param {object} signallerMessage
*/
WebRTCTransport.prototype._onSignal = function(signallerMessage) {
  var self = this;
  var signal = signallerMessage.signal;
  var sender = signallerMessage.sender;
  var handshakeID = signallerMessage.handshakeID;
  var peer = this._peers[signallerMessage.handshakeID];
  if(!peer) {
    peer = this._createPeer(sender, handshakeID, false);
    peer.once('data', function(data) {
      self._handleMessage(data, { nick: signallerMessage.sender });
    });
  }
  peer.signal(signal);
}

/**
* Create a WebRTC Contact
* #_createContact
* @param {object} options
*/
WebRTCTransport.prototype._createContact = function(options) {
  return new WebRTCContact(options);
};

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
WebRTCTransport.prototype._send = function(data, contact) {
  var self = this;
  var handshakeID = hat();
  var newPeer = this._createPeer(contact.nick, handshakeID, true);
  newPeer.once('connect', function() {
    newPeer.send(data);
    setTimeout(function() {
      newPeer.destroy();
    });
  });
};

/**
* Initialize a WebRTC peer and store it in `_peers`
* #_createPeer
* @param {string} nick
* @param {string} handshakeID
* @param {boolean} initiator
*/
WebRTCTransport.prototype._createPeer = function(nick, handshakeID, initiator) {
  var self = this;
  var peer = new SimplePeer({ wrtc: this._wrtc, initiator: initiator });
  peer.on('signal', function(signal) {
    self._signaller.emit(nick, {
      sender: self._contact.nick,
      handshakeID: handshakeID,
      signal: signal
    });
  });
  peer.on('error', function(err) {
    self._log.error('peer encountered an error %s', err.message);
  });
  peer.once('close', function() {
    peer.removeAllListeners('data');
    peer.removeAllListeners('signal');
    peer.removeAllListeners('error');
    delete self._peers[handshakeID];
  })
  this._peers[handshakeID] = peer;
  return peer;
}

/**
* Close the underlying socket
* #_close
*/
WebRTCTransport.prototype._close = function() {
  var self = this;
  Object.keys(this._peers).forEach(function(handshakeID) {
    self._peers[handshakeID].destroy();
  });
  this._peers = {};
  this._signaller.removeListener(this._contact.nick, this._signalHandler);
};

module.exports = WebRTCTransport;
