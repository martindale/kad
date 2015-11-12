'use strict';

var expect = require('chai').expect;
var hat = require('hat');
var sinon = require('sinon');
var constants = require('../../lib/constants');
var RPC = require('../../lib/transports/webrtc');
var WebRTCContact = require('../../lib/contacts/webrtc-contact');
var Message = require('../../lib/message');
var wrtc = require('wrtc');
var transportOptions = { wrtc: wrtc };
var SimplePeer = require('simple-peer');
var EventEmitter = require('events').EventEmitter;

describe('Transports/WebRTC', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      expect(rpc).to.be.instanceOf(RPC);
    });

    it('should create an instance without the `new` keyword', function() {
      var signaller = new EventEmitter();
      var rpc = RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      expect(rpc).to.be.instanceOf(RPC);
    });

    it('should throw without options', function() {
      expect(function() {
        RPC(null);
      }).to.throw(Error, 'Invalid options were supplied');
    });

    it('should throw without signaller', function() {
      expect(function() {
        RPC({ nick: 'a' });
      }).to.throw(Error, 'Invalid signaller was supplied');
    });

    it('should bind to the signaller', function() {
      var signaller = new EventEmitter();
      var addListener = sinon.stub(signaller, 'addListener');
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      expect(addListener.callCount).to.equal(1);
      expect(addListener.calledWith('a', rpc._signalHandler)).to.equal(true);
    });

    it('should emit a ready event', function(done) {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      rpc.on('ready', done);
    });
  });

  describe('#_onSignal', function() {

    it('should create a new peer', function(done) {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var neighbor = new SimplePeer({ wrtc: wrtc, initiator: true });
      neighbor.on('signal', function(signal) {
        var message = { signal: signal, handshakeID: handshakeID, sender: 'b' };
        rpc._onSignal(message);
        var peerCount = Object.keys(rpc._peers).length;
        expect(peerCount).to.equal(1);
        neighbor.destroy();
        done();
      });
    });

    it('should signal a new peer', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var signalStub = sinon.stub();
      sinon.stub(rpc, '_createPeer', function() {
        return { once: sinon.stub(), signal: signalStub };
      });
      rpc._onSignal({ signal: 'test', handshakeID: handshakeID, sender: 'b' });
      expect(signalStub.calledWith('test')).to.equal(true);
    });

    it('should signal an existing peer', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      rpc._createPeer('a', handshakeID, true);
      var peer = rpc._peers[handshakeID];
      var signalStub = sinon.stub(peer, 'signal');
      var signal = '';
      rpc._onSignal({ signal: signal, handshakeID: handshakeID, sender: 'b' });
      expect(signalStub.calledWith(signal)).to.equal(true);
    });
  });

  describe('#_createPeer', function() {

    it("should forward the peer's signals to the signaller", function(done) {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var handshakeID = hat();
      var peer = rpc._createPeer('b', handshakeID, true);
      signaller.once('b', function(message) {
        expect(message.sender).to.equal('a');
        expect(message.handshakeID).to.equal(handshakeID);
        done();
      });
    });

    it("should log the peer's errors", function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var handshakeID = hat();
      var peer = rpc._createPeer('b', handshakeID, true);
      var error = sinon.stub(rpc._log, 'error');
      peer.signal('bad signal');
      var ok = error.calledWith(
        'peer encountered an error %s',
        'signal() called with invalid signal data');
      expect(ok).to.equal(true);
    });

    it("should remove the peer's listeners when closed", function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var handshakeID = hat();
      var peer = rpc._createPeer('b', handshakeID, true);

      // Set up some event listeners
      peer.on('data', expect.fail);
      peer.on('signal', expect.fail);
      peer.on('error', expect.fail);

      // This should remove the event listeners
      peer.emit('close');

      // Make sure the event listeners are removed
      peer.emit('data');
      peer.emit('signal');

      // If error has no event listeners, EventEmitter will throw.
      // So let's just add a stub.
      peer.on('error', sinon.stub());
      peer.emit('error');
    });

    it('should add the peer to the collection', function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var handshakeID = hat();
      var peer = rpc._createPeer('b', handshakeID, true);
      expect(rpc._peers[handshakeID]).to.equal(peer);
    });
  });

  describe('#_createContact', function() {
    it('should create a WebRTCContact', function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var contact = rpc._createContact({ nick: 'b' });
      expect(contact).to.be.instanceOf(WebRTCContact);
    });
  });

  describe('#send', function() {

    var rpc1;
    var rpc2;

    before(function() {
      var signaller = new EventEmitter();
      rpc1 = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      rpc2 = new RPC({ nick: 'b', wrtc: wrtc, signaller: signaller });
    });

    after(function() {
      rpc1.close();
      rpc2.close();
    });

    it('should throw with invalid message', function() {
      var contact = new WebRTCContact({ nick: 'b' });
      expect(function() {
        rpc1.send(contact, {});
      }).to.throw(Error, 'Invalid message supplied');
    });

    it('should send a message and create a response handler', function() {
      var addr1 = rpc1._contact;
      var addr2 = rpc2._contact;
      var contactRpc1 = new WebRTCContact(addr1);
      var contactRpc2 = new WebRTCContact(addr2);
      var msg = new Message('PING', {}, contactRpc1);
      var handler = sinon.stub();
      rpc1.send(contactRpc2, msg, handler);
      var calls = Object.keys(rpc1._pendingCalls);
      expect(calls).to.have.lengthOf(1);
      expect(rpc1._pendingCalls[calls[0]].callback).to.equal(handler);
    });

    it('should send a message and forget it', function() {
      var addr1 = rpc1._contact;
      var addr2 = rpc2._contact;
      var contactRpc1 = new WebRTCContact(addr1);
      var contactRpc2 = new WebRTCContact(addr2);
      var msg = new Message('PING', {}, contactRpc1);
      rpc2.send(contactRpc1, msg);
      var calls = Object.keys(rpc2._pendingCalls);
      expect(calls).to.have.lengthOf(0);
    });

    it('should transmit a message', function(done) {
      var signaller = new EventEmitter();
      var rpc1 = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var rpc2 = new RPC({ nick: 'b', wrtc: wrtc, signaller: signaller });
      var message = new Message('PING', {}, rpc2._contact);
      rpc1.once('PING', function() {
        done();
      });
      rpc2._send(message.serialize(), rpc1._contact);
    });
  });

  describe('#close', function() {

    it('should destroy the underlying peers', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      rpc._createPeer('a', handshakeID, true);
      var peer = rpc._peers[handshakeID];
      var destroy = sinon.stub(peer, 'destroy');
      rpc.close();
      expect(destroy.callCount).to.equal(1);
      expect(rpc._peers).to.deep.equal({});
    });

    it('should unsusbcribe from the signaller', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var removeListener = sinon.stub(signaller, 'removeListener');
      rpc._createPeer('a', handshakeID, true);
      rpc.close();
      expect(removeListener.callCount).to.equal(1);
      expect(removeListener.calledWith('a', rpc._signalHandler)).to.equal(true);
    });
  });

  describe('#_handleMessage', function() {

    var contact1 = new WebRTCContact({ nick: 'a' });
    var validMsg1 = Message('PING', { rpcID: 10 }, contact1).serialize();
    var validMsg2 = Message('PONG', { referenceID: 10 }, contact1).serialize();
    var invalidMsg = Buffer(JSON.stringify({ type: 'WRONG', params: {} }));
    var invalidJSON = Buffer('i am a bad message');
    var rpc = new RPC({ nick: 'b', wrtc: wrtc, signaller: new EventEmitter() });

    it('should drop the message if invalid JSON', function(done) {
      rpc.once('MESSAGE_DROP', function() {
        done();
      });
      rpc._handleMessage(invalidJSON, {});
    });

    it('should drop the message if invalid message type', function(done) {
      rpc.once('MESSAGE_DROP', function() {
        done();
      });
      rpc._handleMessage(invalidMsg, {});
    });

    it('should emit the message type if not a reply', function(done) {
      rpc.once('PING', function(data) {
        expect(typeof data).to.equal('object');
        done();
      });
      rpc._handleMessage(validMsg1, { address: '127.0.0.1', port: 1234 });
    });

    it('should call the message callback if a reply', function(done) {
      rpc._pendingCalls[10] = {
        callback: function(err, params) {
          expect(err).to.equal(null);
          expect(params.referenceID).to.equal(10);
          done();
        }
      }
      rpc._handleMessage(validMsg2, { address: '127.0.0.1', port: 1234 });
    });

  });

  describe('#_expireCalls', function() {

    it('should call expired handler with error and remove it', function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var freshHandler = sinon.stub();
      var staleHandler = sinon.spy();
      rpc._pendingCalls['rpc_id_1'] = {
        timestamp: new Date('1970-1-1'),
        callback: staleHandler
      };
      rpc._pendingCalls['rpc_id_2'] = {
        timestamp: new Date('3070-1-1'),
        callback: freshHandler
      };
      rpc._expireCalls();
      expect(Object.keys(rpc._pendingCalls)).to.have.lengthOf(1);
      expect(freshHandler.callCount).to.equal(0);
      expect(staleHandler.callCount).to.equal(1);
      expect(staleHandler.getCall(0).args[0]).to.be.instanceOf(Error);
    });

  });

  describe('#_close', function() {

    it('should clean up the peers', function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var peer = rpc._createPeer();
      rpc._close();
      expect(peer.destroyed).to.equal(true);
      expect(rpc._peers).to.deep.equal({});
    });

    it('should unsusbcribe from the signaller', function() {
      var signaller = new EventEmitter();
      var rpc = new RPC({ nick: 'a', wrtc: wrtc, signaller: signaller });
      var removeListener = sinon.stub(signaller, 'removeListener');
      rpc._close();
      expect(removeListener.calledWith('a', rpc._signalHandler)).to.equal(true);
    });
  });
});
