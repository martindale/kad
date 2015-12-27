'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var AddressPortContact = require('../lib/contacts/address-port-contact');
var RPC = require('../lib/rpc');
var Message = require('../lib/message');
var inherits = require('util').inherits;

function FakeTransport(contact, options) {
  RPC.call(this, contact, options);
}

inherits(FakeTransport, RPC);

describe('RPC', function() {

  describe('#_createContact', function() {

    it('should throw if not implemented', function() {
      expect(function() {
        var rpc = new RPC({}, {});
        rpc._createContact();
      }).to.throw(Error);
    });

    it('should use replyto if it exists', function() {
      var rpc = new FakeTransport(AddressPortContact({
        address: '0.0.0.0',
        port: 8080
      }), {
        replyto: AddressPortContact({
          address: 'mydomain.tld',
          port: 80
        })
      });
      expect(rpc._contact.address).to.equal('mydomain.tld');
      expect(rpc._contact.port).to.equal(80);
    });

  });

  describe('#receive', function() {

    it('should emit an error if a middleware breaks', function(done) {
      var rpc = new FakeTransport(AddressPortContact({
        address: '0.0.0.0', port: 8080
      }));
      var middleware = function(message, contact, next) {
        next(new Error('FAIL'));
      };
      rpc.before('receive', middleware);
      var message = Message({
        method: 'PING',
        params: { contact: { address: '0.0.0.0', port: 8080 } },
        id: 'test'
      });
      rpc.on('error', function(err) {
        expect(err.message).to.equal('FAIL');
        done();
      });
      rpc.receive(message.serialize());
    });

  });

  describe('#_execPendingCallback', function() {

    it('should should warn about dropped message', function(done) {
      var rpc = new FakeTransport(AddressPortContact({
        address: '0.0.0.0', port: 8080
      }));
      var message = Message({
        result: { contact: { address: '0.0.0.0', port: 8080 } },
        id: 'test'
      });
      var _log = sinon.stub(rpc._log, 'warn', function() {
        _log.restore();
        done();
      });
      rpc._execPendingCallback(message);
    });

  });

  describe('#before', function() {

    it('should register a before hook for the given event name', function() {
      var rpc = new FakeTransport(AddressPortContact({
        address: '0.0.0.0', port: 8080
      }));
      rpc.before('serialize', function(message, next) {
        next();
      });
      expect(typeof rpc._hooks.before.serialize[0]).to.be.equal('function');
    });

  });

  describe('#after', function() {

    it('should register an after hook for the given event name', function() {
      var rpc = new FakeTransport(AddressPortContact({
        address: '0.0.0.0', port: 8080
      }));
      rpc.after('serialize', function(message, next) {
        next();
      });
      expect(typeof rpc._hooks.after.serialize[0]).to.be.equal('function');
    });

  });

  describe('#_trigger', function() {

    it('should trigger the hook stack for the given event', function(done) {
      var rpc = new FakeTransport(AddressPortContact({
        address: '0.0.0.0', port: 8080
      }));
      var hook1 = sinon.stub().callsArg(1);
      var hook2 = sinon.stub().callsArg(1);
      var hook3 = sinon.stub().callsArg(1);
      var hook4 = sinon.stub().callsArg(0);
      rpc.before('test', hook1);
      rpc.before('test', hook2);
      rpc.before('test', hook3);
      rpc.after('test', hook4);
      rpc._trigger('before:test', [{ fake: 'message' }], function() {
        rpc._trigger('after:test');
        expect(hook1.called).to.equal(true);
        expect(hook2.called).to.equal(true);
        expect(hook3.called).to.equal(true);
        expect(hook4.called).to.equal(true);
        done();
      });
    });

  });

});
