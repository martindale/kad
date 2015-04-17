'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var Node = require('../lib/node');

function FakeStorage() {
  this.data = {};
}

FakeStorage.prototype.get = function(key, cb) {
  if (!this.data[key]) return cb(new Error('not found'));
  cb(null, this.data[key]);
};

FakeStorage.prototype.set = function(key, val, cb) {
  this.data[key] = val;
  cb(null, this.data[key]);
};

var storage1 = new FakeStorage();
var storage2 = new FakeStorage();
var storage3 = new FakeStorage();

var node1;
var node2;
var node3;

var node1opts = {
  address: '127.0.0.1',
  port: 65533,
  storage: storage1
};
var node2opts = {
  address: '127.0.0.1',
  port: 65534,
  storage: storage2
};
var node3opts = {
  address: '127.0.0.1',
  port: 65535,
  storage: storage3
};

var logLevel = process.env.LOG_LEVEL;

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


  });


  describe('#set', function() {

    it('should succeed in setting the value to the dht', function(done) {
      node1.set('beep', 'boop', function(err) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('should pass an error to the callback if failed', function(done) {
      var _set = sinon.stub(node2, 'set', function(k, v, cb) {
        cb(new Error('fail'));
      });
      node2.set('beep', 'boop', function(err) {
        expect(err.message).to.equal('fail');
        _set.restore();
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
