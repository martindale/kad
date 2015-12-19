'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var KNode = require('../lib/node');
var transports = require('../lib/transports');
var Logger = require('../lib/logger');

function FakeStorage() {
  this.data = {};
}

FakeStorage.prototype.get = function(key, cb) {
  if (!this.data[key]) {
    return cb(new Error('not found'));
  }
  cb(null, this.data[key]);
};

FakeStorage.prototype.put = function(key, val, cb) {
  this.data[key] = val;
  cb(null);
};

FakeStorage.prototype.del = function(key, cb) {
  delete this.data[key];
  cb(null);
};

FakeStorage.prototype.createReadStream = function() {

};

var storage1 = new FakeStorage();
var storage2 = new FakeStorage();
var storage3 = new FakeStorage();
var storage4 = new FakeStorage();
var storage5 = new FakeStorage();
var storage6 = new FakeStorage();
var storage10 = new FakeStorage();
var storage11 = new FakeStorage();

var node1;
var node2;
var node3;
var node4;
var node5;
var node6;
var node10;
var node11;

var node1opts = {
  address: '127.0.0.1',
  port: 65520,
  storage: storage1,
  logger: new Logger(0)
};
var node2opts = {
  address: '127.0.0.1',
  port: 65521,
  storage: storage2,
  logger: new Logger(0)
};
var node3opts = {
  address: '127.0.0.1',
  port: 65522,
  storage: storage3,
  logger: new Logger(0)
};
var node4opts = {
  address: '127.0.0.1',
  port: 65523,
  storage: storage4,
  logger: new Logger(0),
  transport: transports.TCP
};
var node5opts = {
  address: '127.0.0.1',
  port: 65524,
  storage: storage5,
  logger: new Logger(0),
  transport: transports.TCP
};
var node6opts = {
  address: '127.0.0.1',
  port: 65525,
  storage: storage6,
  logger: new Logger(0),
  transport: transports.TCP
};
var node10opts = {
  address: '127.0.0.1',
  port: 30000,
  storage: storage10,
  logger: new Logger(0),
  transport: transports.HTTP
};
var node11opts = {
  address: '127.0.0.1',
  port: 30001,
  storage: storage11,
  logger: new Logger(0),
  transport: transports.HTTP
};

describe('Node+Router', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      expect(new KNode({
        storage: storage1,
        address: '0.0.0.0',
        port: 0,
        logger: new Logger(0)
      })).to.be.instanceOf(KNode);
    });

    it('should create an instance without the `new` keyword', function() {
      expect(KNode({
        storage: storage1,
        address: '0.0.0.0',
        port: 0,
        logger: new Logger(0)
      })).to.be.instanceOf(KNode);
    });

    it('should throw if no storage adapter is supplied', function() {
      expect(function() {
        KNode({
          address: '0.0.0.0',
          port: 0,
          logger: new Logger(0)
        });
      }).to.throw(Error, 'No storage adapter supplied');
    });

  });

  describe('#connect', function() {

    it('should connect node2 to node1 over udp', function(done) {
      node1 = KNode(node1opts);
      node2 = KNode(node2opts);
      node2.connect(node1opts, function() {
        expect(Object.keys(node2._router._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node3 to node2 over udp', function(done) {
      node3 = KNode(node3opts);
      node3.connect(node2opts, function() {
        expect(Object.keys(node3._router._buckets)).to.have.lengthOf(2);
        done();
      });
    });

    it('should connect node1 to node3 over udp', function(done) {
      node1.connect(node3opts, function() {
        expect(Object.keys(node1._router._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node5 to node4 over tcp', function(done) {
      node4 = KNode(node4opts);
      node5 = KNode(node5opts);
      node5.connect(node4opts, function() {
        expect(Object.keys(node5._router._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node6 to node5 over tcp', function(done) {
      node6 = KNode(node6opts);
      node6.connect(node5opts, function() {
        expect(Object.keys(node6._router._buckets)).to.have.lengthOf(2);
        done();
      });
    });

    it('should connect node4 to node6 over tcp', function(done) {
      node4.connect(node6opts, function() {
        expect(Object.keys(node4._router._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node10 to node11 over http', function(done) {
      node10 = KNode(node10opts);
      node11 = KNode(node11opts);
      node10.connect(node11opts, function() {
        expect(Object.keys(node10._router._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should emit an error if the connection fails', function(done) {
      var node = KNode({
        address: '0.0.0.0',
        port: 65532,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var _findNode = sinon.stub(node._router, 'findNode', function(id, cb) {
        return cb(new Error('fatal error'));
      });
      node.connect({ address: '127.0.0.1', port: 3333 }, function(err) {
        expect(err.message).to.equal('fatal error');
        _findNode.restore();
        done();
      });
    });

    it('should not require a callback', function(done) {
      var node = KNode({
        address: '0.0.0.0',
        port: 65531,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var _findNode = sinon.stub(node._router, 'findNode', function(id, cb) {
        return cb(new Error('fatal error'));
      });
      node.on('error', function(err) {
        expect(err.message).to.equal('fatal error');
        _findNode.restore();
        done();
      });
      node.connect({ address: '127.0.0.1', port: 3333 });
    });

  });


  describe('#put', function() {

    it('should succeed in setting the value to the dht', function(done) {
      node1.put('beep', 'boop', function(err) {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should succeed in setting the value to the dht', function(done) {
      node10.put('beep', 'boop', function(err) {
        expect(err).to.equal(undefined);
        done();
      });
    });

    it('should pass an error to the callback if failed', function(done) {
      var _set = sinon.stub(node2, 'put', function(k, v, cb) {
        cb(new Error('fail'));
      });
      node2.put('beep', 'boop', function(err) {
        expect(err.message).to.equal('fail');
        _set.restore();
        done();
      });
    });

    it('should callback with an error if _findNode fails', function(done) {
      var node = KNode({
        address: '0.0.0.0',
        port: 65530,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      node.put('beep', 'boop', function(err) {
        expect(err.message).to.equal('Not connected to any peers');
        done();
      });
    });

  });

  describe('#get', function() {

    it('should succeed in getting the value from the dht', function(done) {
      node1.get('beep', function(err, value) {
        expect(err).to.equal(null);
        expect(value).to.equal('boop');
        done();
      });
    });

    it('should succeed in getting the value from the dht', function(done) {
      node10.get('beep', function(err, value) {
        expect(err).to.equal(null);
        expect(value).to.equal('boop');
        done();
      });
    });

    it('should pass an error to the callback if failed', function(done) {
      var _get = sinon.stub(node3, 'get', function(k, cb) {
        cb(new Error('fail'));
      });
      node3.get('beep', function(err) {
        expect(err.message).to.equal('fail');
        _get.restore();
        done();
      });
    });

  });

});
