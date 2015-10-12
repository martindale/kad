'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var utils = require('../lib/utils');
var constants = require('../lib/constants');
var Node = require('../lib/node');
var AddressPortContact = require('../lib/transports/address-port-contact');
var Bucket = require('../lib/bucket');
var EventEmitter = require('events').EventEmitter;

function FakeStorage() {
  this.data = {};
}

FakeStorage.prototype.get = function(key, cb) {
  if (!this.data[key]) return cb(new Error('not found'));
  cb(null, this.data[key]);
};

FakeStorage.prototype.put = function(key, val, cb) {
  this.data[key] = val;
  cb(null, this.data[key]);
};

FakeStorage.prototype.del = function(key, cb) {
  delete this.data[key];
  cb(null);
};

FakeStorage.prototype.createReadStream = function() {
  return new EventEmitter();
};

describe('Node', function() {

  describe('#_findValue', function() {

    it('should callback with an error if no value is found', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65528, storage: new FakeStorage() });
      var _find = sinon.stub(node, '_find', function(k, t, cb) {
        cb(new Error(), 'NODE');
      });
      node._findValue('beep', function(err) {
        expect(err.message).to.equal('Failed to find value for key: beep');
        _find.restore();
        done();
      });
    });

  });

  describe('#_updateContact', function() {

    it('should ping the contact at bucket head if bucket is full', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65527, storage: new FakeStorage() });
      var contact = new AddressPortContact({ address: '127.0.0.1', port: 1234 });
      var _send = sinon.stub(node._rpc, 'send', function(c, m, cb) {
        cb();
      });
      var counter = 0;
      var bucketContact;
      node._buckets[159] = new Bucket();
      for (var i = 0; i < constants.B; i++) {
        bucketContact = AddressPortContact({ address: '127.0.0.1', port: counter });
        node._buckets[159].addContact(bucketContact);
        counter++;
      }
      node._updateContact(contact, function() {
        expect(node._buckets[159].hasContact(contact.nodeID)).to.equal(false);
        done();
      });
    });

  });

  describe('#_handlePing', function() {

    it('should pong the contact', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65526, storage: new FakeStorage() });
      var _rpc = sinon.stub(node._rpc, 'send', function(c, m, cb) {
        expect(m.type).to.equal('PONG');
        _rpc.restore();
        done();
      });
      node._handlePing({
        address: '0.0.0.0',
        port: 1234,
        nodeID: utils.createID('data'),
        rpcID: utils.createID('data')
      });
    });

  });

  describe('#_handleStore', function() {

    it('should halt if invalid key or no value', function() {
      var node = Node({ address: '0.0.0.0', port: 65525, storage: new FakeStorage() });
      var _get = sinon.stub(node._storage, 'get');
      node._handleStore({ key: 'beep', value: null });
      expect(_get.callCount).to.equal(0);
      _get.restore();
    });

  });

  describe('#_handleFindValue', function() {

    it('should halt if invalid key', function() {
      var node = Node({ address: '0.0.0.0', port: 65524, storage: new FakeStorage() });
      var _get = sinon.stub(node._storage, 'get');
      node._handleFindValue({
        key: 'beep',
        address: '0.0.0.0',
        port: 1234,
        nodeID: utils.createID('data')
      });
      expect(_get.callCount).to.equal(0);
      _get.restore();
    });

    it('should send contacts if no value found', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65523, storage: new FakeStorage() });
      var _send = sinon.stub(node._rpc, 'send', function(c, m, cb) {
        expect(m.params.contacts).to.be.ok;
        _send.restore();
        done();
      });
      node._handleFindValue({
        key: utils.createID('beep'),
        address: '0.0.0.0',
        port: 1234,
        nodeID: utils.createID('data')
      });
    });

  });

  describe('#get', function() {

    it('should pass along error if _findValue fails', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65522, storage: new FakeStorage() });
      var _findValue = sinon.stub(node, '_findValue', function(k, cb) {
        cb(new Error('Failed for some reason'));
      });
      node.get('beep', function(err) {
        expect(err.message).to.equal('Failed for some reason');
        _findValue.restore();
        done();
      });
    });

    it('should return the value in storage', function(done) {
      var storage = new FakeStorage();
      var node = Node({ address: '0.0.0.0', port: 65522, storage: storage });
      storage.data.beep = JSON.stringify({ value: 'boop' });
      node.get('beep', { hashkey: false }, function(err, val) {
        expect(err).to.equal(null);
        expect(val).to.equal('boop');
        done();
      });
    });

  });

  describe('#_replicate', function() {

    var stream = new EventEmitter();
    var node = Node({ address: '0.0.0.0', port: 65521, storage: new FakeStorage() });

    node._storage.createReadStream = function() {
      return stream;
    };

    it('should replicate the item it did not publish after T_EXPIRE', function(done) {
      var _put = sinon.stub(node, 'put', function(k, v, cb) {
        cb(null);
        _put.restore();
        stream.removeAllListeners();
        done();
      });
      node._replicate();
      setImmediate(function() {
        stream.emit('data', {
          key: utils.createID('beep'),
          value: {
            value: 'boop',
            timestamp: Date.now() - constants.T_REPUBLISH,
            publisher: utils.createID('some_other_node_id')
          }
        });
      });
    });

    it('should replicate the item it did publish after T_REPUBLISH', function(done) {
      var _put = sinon.stub(node, 'put', function(k, v, cb) {
        cb(null);
        _put.restore();
        done();
      });
      node._replicate();
      setImmediate(function() {
        stream.emit('data', {
          key: utils.createID('beep'),
          value: {
            value: 'boop',
            timestamp: Date.now() - constants.T_REPUBLISH,
            publisher: node._self.nodeID
          }
        });
      });
    });

    it('should call the error handler', function(done) {
      var _error = sinon.stub(node._log, 'error', function() {
        _error.restore();
        done();
      });
      stream.emit('error', new Error());
    });

    it('should call the end handler', function(done) {
      var _info = sinon.stub(node._log, 'info', function() {
        _info.restore();
        done();
      });
      stream.emit('end');
    });

  });

  describe('#_expire', function() {

    var stream = new EventEmitter();
    var node = Node({ address: '0.0.0.0', port: 65520, storage: new FakeStorage() });

    node._storage.createReadStream = function() {
      return stream;
    };

    it('should expire the item after T_EXPIRE', function(done) {
      var _del = sinon.stub(node._storage, 'del', function(k, cb) {
        cb(null);
        _del.restore();
        done();
      });
      node._expire();
      setImmediate(function() {
        stream.emit('data', {
          key: utils.createID('beep'),
          value: {
            value: 'boop',
            timestamp: Date.now(),
            publisher: utils.createID('some_other_node_id')
          }
        });
        stream.emit('data', {
          key: utils.createID('beep'),
          value: {
            value: 'boop',
            timestamp: Date.now() - constants.T_EXPIRE,
            publisher: utils.createID('some_other_node_id')
          }
        });
      });
    });

    it('should call the error handler', function(done) {
      var _error = sinon.stub(node._log, 'error', function() {
        _error.restore();
        done();
      });
      stream.emit('error', new Error());
    });

    it('should call the end handler', function(done) {
      var _info = sinon.stub(node._log, 'info', function() {
        _info.restore();
        done();
      });
      stream.emit('end');
    });

  });

});
