'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var constants = require('../../lib/constants');
var RPC = require('../../lib/transports/udp');
var AddressPortContact = require('../../lib/transports/address-port-contact');
var Message = require('../../lib/message');

describe('Transports/UDP', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var rpc = new RPC(contact);
      expect(rpc).to.be.instanceOf(RPC);
    });

    it('should create an instance without the `new` keyword', function() {
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var rpc = RPC(contact);
      expect(rpc).to.be.instanceOf(RPC);
    });

    it('should bind to the given port (or random port)', function(done) {
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var rpc = RPC(contact);
      rpc.on('ready', function() {
        expect(rpc._socket.address().address).to.equal('0.0.0.0');
        expect(typeof rpc._socket.address().port).to.equal('number');
        done();
      });
    });

  });

  describe('#_createContact', function() {
    it('should create an AddressPortContact', function() {
      var rpc = new RPC({ address: '0.0.0.0', port: 1 });
      var contact = rpc._createContact({ address: '0.0.0.0', port: 0 });
      expect(contact).to.be.instanceOf(AddressPortContact);
    });
  });

  describe('#send', function() {

    var contact1 = new AddressPortContact({ address: '0.0.0.0', port: 0 });
    var contact2 = new AddressPortContact({ address: '0.0.0.0', port: 0 });
    var rpc1;
    var rpc2;

    before(function(done) {
      var count = 0;
      rpc1 = new RPC(contact1);
      rpc2 = new RPC(contact1);
      rpc1.on('ready', inc);
      rpc2.on('ready', inc);
      function inc() {
        count++;
        ready();
      }
      function ready() {
        if (count === 2) done();
      }
    });

    after(function() {
      rpc1.close();
      rpc2.close();
    });

    it('should throw with invalid contact', function() {
      expect(function() {
        rpc1.send({ address: '0.0.0.0' });
      }).to.throw(Error, 'Invalid contact supplied');
    });

    it('should throw with invalid message', function() {
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      expect(function() {
        rpc1.send(contact, {});
      }).to.throw(Error, 'Invalid message supplied');
    });

    it('should send a message and create a response handler', function() {
      var addr1 = rpc1._socket.address();
      var addr2 = rpc2._socket.address();
      var contactRpc1 = new AddressPortContact(addr1);
      var contactRpc2 = new AddressPortContact(addr2);
      var msg = new Message('PING', {}, contactRpc1);
      var handler = sinon.stub();
      rpc1.send(contactRpc2, msg, handler);
      var calls = Object.keys(rpc1._pendingCalls);
      expect(calls).to.have.lengthOf(1);
      expect(rpc1._pendingCalls[calls[0]].callback).to.equal(handler);
    });

    it('should send a message and forget it', function() {
      var addr1 = rpc1._socket.address();
      var addr2 = rpc2._socket.address();
      var contactRpc1 = new AddressPortContact(addr1);
      var contactRpc2 = new AddressPortContact(addr2);
      var msg = new Message('PING', {}, contactRpc1);
      rpc2.send(contactRpc1, msg);
      var calls = Object.keys(rpc2._pendingCalls);
      expect(calls).to.have.lengthOf(0);
    });

  });

  describe('#close', function() {

    it('should close the underlying socket', function(done) {
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var rpc = new RPC(contact);
      rpc.on('ready', function() {
        expect(rpc._socket._receiving).to.equal(true);
        rpc.close();
        expect(rpc._socket._receiving).to.equal(false);
        done();
      });
    });

  });

  describe('#_handleMessage', function() {

    var contact1 = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
    var contact2 = new AddressPortContact({ address: '0.0.0.0', port: 0 });
    var validMsg1 = Message('PING', { rpcID: 10 }, contact1).serialize();
    var validMsg2 = Message('PONG', { referenceID: 10 }, contact1).serialize();
    var invalidMsg = Buffer(JSON.stringify({ type: 'WRONG', params: {} }));
    var invalidJSON = Buffer('i am a bad message');
    var rpc = new RPC(contact2);

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
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var rpc = new RPC(contact);
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

});
