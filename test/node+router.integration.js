'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var constants = require('../lib/constants');
var Node = require('../lib/node');
var Contact = require('../lib/contact');
var Bucket = require('../lib/bucket');

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

var storage1 = new FakeStorage();
var storage2 = new FakeStorage();
var storage3 = new FakeStorage();

var node1;
var node2;
var node3;

var logLevel = Number(process.env.LOG_LEVEL);

var node1opts = {
  address: '127.0.0.1',
  port: 65533,
  storage: storage1,
  logLevel: logLevel
};
var node2opts = {
  address: '127.0.0.1',
  port: 65534,
  storage: storage2,
  logLevel: logLevel
};
var node3opts = {
  address: '127.0.0.1',
  port: 65535,
  storage: storage3,
  logLevel: logLevel
};

describe('Node+Router', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      expect(new Node({
        storage: storage1,
        address: '0.0.0.0',
        port: 0
      })).to.be.instanceOf(Node);
    });

    it('should create an instance without the `new` keyword', function() {
      expect(Node({
        storage: storage1,
        address: '0.0.0.0',
        port: 0
      })).to.be.instanceOf(Node);
    });

    it('should throw if no storage adapter is supplied', function() {
      expect(function() {
        Node({
          address: '0.0.0.0',
          port: 0
        })
      }).to.throw(Error, 'No storage adapter supplied');
    });

  });

  describe('#connect', function() {

    node1 = Node(node1opts);
    node2 = Node(node2opts);
    node3 = Node(node3opts);

    it('should connect node2 to node1', function(done) {
      node2.connect('127.0.0.1', node1opts.port, function() {
        expect(Object.keys(node2._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node3 to node2', function(done) {
      node3.connect('127.0.0.1', node2opts.port, function() {
        expect(Object.keys(node3._buckets)).to.have.lengthOf(2);
        done();
      });
    });

    it('should connect node1 to node3', function(done) {
      node1.connect('127.0.0.1', node3opts.port, function() {
        expect(Object.keys(node1._buckets)).to.have.lengthOf(2);
        done();
      });
    });

    it('should emit an error if the connection fails', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65532, storage: new FakeStorage() });
      var _findNode = sinon.stub(node, '_findNode', function(id, cb) {
        return cb(new Error('fatal error'));
      });
      node.connect('127.0.0.1', 3333, function(err) {
        expect(err.message).to.equal('fatal error');
        _findNode.restore();
        done();
      });
    });

    it('should not require a callback', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65531, storage: new FakeStorage() });
      var _findNode = sinon.stub(node, '_findNode', function(id, cb) {
        return cb(new Error('fatal error'));
      });
      node.on('error', function(err) {
        expect(err.message).to.equal('fatal error');
        _findNode.restore();
        done();
      });
      node.connect('127.0.0.1', 3333);
    });

  });


  describe('#put', function() {

    it('should succeed in setting the value to the dht', function(done) {
      node1.put('beep', 'boop', function(err) {
        expect(err).to.not.be.ok;
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
      var node = Node({ address: '0.0.0.0', port: 65530, storage: new FakeStorage() });
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

    it('should pass an error to the callback if failed', function(done) {
      var _get = sinon.stub(node3, 'get', function(k, cb) {
        cb(new Error('fail'));
      });
      node3.get('beep', function(err, val) {
        expect(err.message).to.equal('fail');
        _get.restore();
        done();
      });
    });

  });

});
