'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var utils = require('../lib/utils');
var constants = require('../lib/constants');
var Router = require('../lib/router');
var Item = require('../lib/item');
var AddressPortContact = require('../lib/contacts/address-port-contact');
var Node = require('../lib/node');

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

describe('Router', function() {

  describe('#_queryContact', function() {

    it('should remove the contact from the shortlist on error', function(done) {
      var router = new Router('VALUE', utils.createID('foo'), new Node({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage()
      }));
      var _rpc = sinon.stub(router.node._rpc, 'send', function(c, m, cb) {
        cb(new Error());
      });
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      router.shortlist.push(contact);
      router._queryContact(contact, function() {
        expect(router.shortlist).to.have.lengthOf(0);
        _rpc.restore();
        done();
      });
    });

  });

  describe('#_handleFindResult', function() {

    it('should track contact without value to store later', function(done) {
      var router = new Router('VALUE', utils.createID('foo'), new Node({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage()
      }));
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      router.shortlist.push(contact);
      router.closestNodeDistance = '00000000000000000001';
      router._handleFindResult({
        value: null,
        contacts: []
      }, contact, function() {
        expect(router.contactsWithoutValue).to.have.lengthOf(1);
        done();
      });
    });

    it('should remove contact from shortlist when JSON is bad', function(done) {
      var node = new Node({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage()
      });
      var router = new Router('VALUE', utils.createID('foo'), node);
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      router.shortlist.push(contact);
      router.closestNodeDistance = '00000000000000000001';
      router._handleFindResult({
        value: 'bad JSON',
        contacts: []
      }, contact, function() {
        expect(router.shortlist).to.have.lengthOf(0);
        done();
      });
    });

    it('should remove contact from shortlist when invalid', function(done) {
      var node = new Node({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        validateKeyValuePair: validateKeyValuePair
      });
      var router = new Router('VALUE', utils.createID('foo'), node);
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      router.shortlist.push(contact);
      router.closestNodeDistance = '00000000000000000001';
      var itemKey = utils.createID('beep');
      var publisherKey = utils.createID('publisher');
      var item = new Item(itemKey, 'boop', publisherKey);
      router._handleFindResult({
        value: JSON.stringify(item),
        contacts: []
      }, contact, function() {
        expect(router.shortlist).to.have.lengthOf(0);
        done();
      });

      function validateKeyValuePair(key, value, callback) {
        callback(false);
      }
    });

    it('should send key/value pair to validator', function(done) {
      var node = new Node({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        validateKeyValuePair: validateKeyValuePair
      });
      var itemKey = utils.createID('beep');
      var publisherKey = utils.createID('publisher');
      var item = new Item(itemKey, 'boop', publisherKey);
      var router = new Router('VALUE', utils.createID('key'), node);
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      router.shortlist.push(contact);
      router.closestNodeDistance = '00000000000000000001';
      router._handleFindResult({
        value: JSON.stringify(item),
        contacts: []
      }, contact, expect.fail);

      function validateKeyValuePair(key, value, callback) {
        expect(key).to.equal(utils.createID('key'));
        expect(value).to.equal('boop');
        done();
      };
    });
  });

  describe('#_handleQueryResults', function() {

    it('should callback with the shortlist if it is full', function(done) {
      var router = new Router('NODE', utils.createID('foo'), new Node({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage()
      }));
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      router.shortlist = new Array(constants.K);
      router._handleQueryResults(function(err, type, contacts) {
        expect(contacts).to.equal(router.shortlist);
        done();
      });
    });

  });

  describe('#_handleValueReturned', function() {

    it('should store at closest node that did not have value', function(done) {
      var router = new Router('NODE', utils.createID('foo'), new Node({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage()
      }));
      var _send = sinon.stub(router.node._rpc, 'send');
      var contact1 = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      var contact2 = new AddressPortContact({ address: '0.0.0.0', port: 1235 });
      router.contactsWithoutValue = [contact1, contact2];
      router._handleValueReturned(function(err, type, contacts) {
        expect(_send.callCount).to.equal(1);
        expect(_send.calledWith(contact1)).to.equal(true);
        done();
      });
    });

  });

});
