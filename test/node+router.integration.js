'use strict';

var expect = require('chai').expect;
var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');
var constants = require('../lib/constants');
var Node = require('../lib/node');
var Contact = require('../lib/contact');
var Bucket = require('../lib/bucket');
var transports = require('../lib/transports');
var wrtc = require('wrtc');

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

};

var storage1 = new FakeStorage();
var storage2 = new FakeStorage();
var storage3 = new FakeStorage();
var storage4 = new FakeStorage();
var storage5 = new FakeStorage();
var storage6 = new FakeStorage();
var storage7 = new FakeStorage();
var storage8 = new FakeStorage();
var storage9 = new FakeStorage();

var node1;
var node2;
var node3;
var node4;
var node5;
var node6;
var node7;
var node8;
var node9;
var signaller = new EventEmitter();

var logLevel = Number(process.env.LOG_LEVEL);

var node1opts = {
  address: '127.0.0.1',
  port: 65520,
  storage: storage1,
  logLevel: logLevel
};
var node2opts = {
  address: '127.0.0.1',
  port: 65521,
  storage: storage2,
  logLevel: logLevel
};
var node3opts = {
  address: '127.0.0.1',
  port: 65522,
  storage: storage3,
  logLevel: logLevel
};
var node4opts = {
  address: '127.0.0.1',
  port: 65523,
  storage: storage4,
  logLevel: logLevel,
  transport: transports.TCP
};
var node5opts = {
  address: '127.0.0.1',
  port: 65524,
  storage: storage5,
  logLevel: logLevel,
  transport: transports.TCP
};
var node6opts = {
  address: '127.0.0.1',
  port: 65525,
  storage: storage6,
  logLevel: logLevel,
  transport: transports.TCP
};
var node7opts = {
  nick: '65523',
  storage: storage7,
  logLevel: logLevel,
  signaller: signaller,
  transport: transports.WebRTC,
  wrtc: wrtc
};
var node8opts = {
  nick: '65524',
  storage: storage8,
  logLevel: logLevel,
  signaller: signaller,
  transport: transports.WebRTC,
  wrtc: wrtc
};
var node9opts = {
  nick: '65525',
  storage: storage9,
  logLevel: logLevel,
  signaller: signaller,
  transport: transports.WebRTC,
  wrtc: wrtc
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
    node4 = Node(node4opts);
    node5 = Node(node5opts);
    node6 = Node(node6opts);
    node7 = Node(node7opts);
    node8 = Node(node8opts);
    node9 = Node(node9opts);

    it('should connect node2 to node1 over udp', function(done) {
      node2.connect(node1opts, function() {
        expect(Object.keys(node2._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node5 to node4 over tcp', function(done) {
      node5.connect(node4opts, function() {
        expect(Object.keys(node5._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node8 to node7 over webrtc', function(done) {
      this.timeout(5000);
      node8.connect(node7opts, function() {
        expect(Object.keys(node8._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node3 to node2 over udp', function(done) {
      node3.connect(node2opts, function() {
        expect(Object.keys(node3._buckets)).to.have.lengthOf(2);
        done();
      });
    });

    it('should connect node6 to node5 over tcp', function(done) {
      node6.connect(node5opts, function() {
        expect(Object.keys(node6._buckets)).to.have.lengthOf(2);
        done();
      });
    });

    it('should connect node9 to node8 over webrtc', function(done) {
      this.timeout(5000);
      node9.connect(node8opts, function() {
        expect(Object.keys(node9._buckets)).to.have.lengthOf(2);
        done();
      });
    });

    it('should connect node1 to node3 over udp', function(done) {
      node1.connect(node3opts, function() {
        expect(Object.keys(node1._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node4 to node6 over tcp', function(done) {
      node4.connect(node6opts, function() {
        expect(Object.keys(node4._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should connect node7 to node9 over webrtc', function(done) {
      this.timeout(5000);
      node7.connect(node9opts, function() {
        expect(Object.keys(node7._buckets)).to.have.lengthOf(1);
        done();
      });
    });

    it('should emit an error if the connection fails', function(done) {
      var node = Node({ address: '0.0.0.0', port: 65532, storage: new FakeStorage() });
      var _findNode = sinon.stub(node, '_findNode', function(id, cb) {
        return cb(new Error('fatal error'));
      });
      node.connect({ address: '127.0.0.1', port: 3333 }, function(err) {
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
      node.connect({ address: '127.0.0.1', port: 3333 });
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
