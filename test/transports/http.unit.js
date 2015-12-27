'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var EventEmitter = require('events').EventEmitter;
var RPC = require('../../lib/transports/http');
var AddressPortContact = require('../../lib/contacts/address-port-contact');
var Message = require('../../lib/message');

describe('Transports/HTTP', function() {

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
        expect(rpc._server.address().address).to.equal('0.0.0.0');
        expect(typeof rpc._server.address().port).to.equal('number');
        done();
      });
    });

    it('should pass null the handleMessage if parsing fails', function(done) {
      var req = new EventEmitter();
      var res = new EventEmitter();
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var HTTP = proxyquire('../../lib/transports/http', {
        http: {
          createServer: function(onConnect) {
            onConnect(req, res);
            return { listen: sinon.stub() };
          }
        }
      });
      var rpc = new HTTP(contact);
      var receive = sinon.stub(rpc, 'receive', function(buff) {
        expect(buff).to.equal(null);
        receive.restore();
        done();
      });
      setImmediate(function() {
        req.emit('end');
      });
    });

    it('should pass pass on the message if it is a response', function(done) {
      var req = new EventEmitter();
      var res = new EventEmitter();
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var HTTP = proxyquire('../../lib/transports/http', {
        http: {
          createServer: function(onConnect) {
            onConnect(req, res);
            return { listen: sinon.stub() };
          }
        }
      });
      var rpc = new HTTP(contact);
      var receive = sinon.stub(rpc, 'receive', function(buff) {
        expect(buff.toString()).to.equal(JSON.stringify({
          id: 'response',
          result: { contact: contact }
        }));
        receive.restore();
        done();
      });
      setImmediate(function() {
        req.emit('data', JSON.stringify({
          id: 'response',
          result: { contact: contact }
        }));
        req.emit('end');
      });
    });

  });

  describe('#_createContact', function() {
    it('should create an AddressPortContact', function() {
      var rpc = new RPC(AddressPortContact({ address: '0.0.0.0', port: 1 }));
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
      function inc() {
        count++;
        ready();
      }
      function ready() {
        if (count === 2) {
          done();
        }
      }
      rpc1 = new RPC(contact1);
      rpc2 = new RPC(contact2);
      rpc1.on('ready', inc);
      rpc2.on('ready', inc);
    });

    after(function() {
      rpc1.close();
      rpc2.close();
    });

    it('should throw with invalid message', function() {
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      expect(function() {
        rpc1.send(contact, {});
      }).to.throw(Error, 'Invalid message supplied');
    });

    it('should send a message and create a response handler', function() {
      var addr1 = rpc1._server.address();
      var addr2 = rpc2._server.address();
      var contactRpc1 = new AddressPortContact(addr1);
      var contactRpc2 = new AddressPortContact(addr2);
      var msg = new Message({
        method: 'PING',
        params: { contact: contactRpc1 },
      });
      var handler = sinon.stub();
      rpc1.send(contactRpc2, msg, handler);
      var calls = Object.keys(rpc1._pendingCalls);
      expect(calls).to.have.lengthOf(1);
      expect(rpc1._pendingCalls[calls[0]].callback).to.equal(handler);
    });

    it('should send a message and forget it', function() {
      var addr1 = rpc1._server.address();
      var addr2 = rpc2._server.address();
      var contactRpc1 = new AddressPortContact(addr1);
      var contactRpc2 = new AddressPortContact(addr2);
      var msg = new Message({
        method: 'PING',
        params: { contact: contactRpc2 },
      });
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
        expect(!!rpc._server._handle).to.equal(true);
        rpc.close();
        expect(rpc._server._handle).to.equal(null);
        done();
      });
    });

  });

  describe('#receive', function() {

    var contact1 = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
    var contact2 = new AddressPortContact({ address: '0.0.0.0', port: 0 });
    var validMsg1 = Message({
      method: 'PING',
      params: { contact: contact1 },
    }).serialize();
    validMsg1.id = 10;
    var validMsg2 = Message({
      id: 10,
      result: { contact: contact1 },
    }).serialize();
    var invalidMsg = Buffer(JSON.stringify({ type: 'WRONG', params: {} }));
    var invalidJSON = Buffer('i am a bad message');
    var rpc = new RPC(contact2);

    it('should drop the message if invalid JSON', function(done) {
      rpc.once('MESSAGE_DROP', function() {
        done();
      });
      rpc.receive(invalidJSON, {});
    });

    it('should drop the message if invalid message type', function(done) {
      rpc.once('MESSAGE_DROP', function() {
        done();
      });
      rpc.receive(invalidMsg, {});
    });

    it('should emit the message type if not a reply', function(done) {
      rpc.once('PING', function(data) {
        expect(typeof data).to.equal('object');
        done();
      });
      rpc.receive(validMsg1, { address: '127.0.0.1', port: 1234 });
    });

    it('should call the message callback if a reply', function(done) {
      rpc._pendingCalls[10] = {
        callback: function(err, msg) {
          expect(err).to.equal(null);
          expect(msg.id).to.equal(10);
          done();
        }
      };
      rpc.receive(validMsg2, { address: '127.0.0.1', port: 1234 });
    });

  });

  describe('#_expireCalls', function() {

    it('should call expired handler with error and remove it', function() {
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var rpc = new RPC(contact);
      var freshHandler = sinon.stub();
      var staleHandler = sinon.spy();
      rpc._pendingCalls.rpc_id_1 = {
        timestamp: new Date('1970-1-1'),
        callback: staleHandler
      };
      rpc._pendingCalls.rpc_id_2 = {
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

  describe('#_send', function() {

    it('should pass null to handleMessage on request error', function(done) {
      var emitter = new EventEmitter();
      emitter.end = sinon.stub();
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 0 });
      var HTTP = proxyquire('../../lib/transports/http', {
        http: {
          request: function() {
            return emitter;
          },
          createServer: function() {
            return { listen: sinon.stub() };
          }
        }
      });
      var rpc = new HTTP(contact);
      var receive = sinon.stub(rpc, 'receive', function(buff) {
        expect(buff).to.equal(null);
        receive.restore();
        done();
      });
      rpc._send(new Buffer(JSON.stringify({})), contact);
      setImmediate(function() {
        emitter.emit('error', new Error('Fail'));
      });
    });

  });

});
