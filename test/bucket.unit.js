'use strict';

var expect = require('chai').expect;
var Bucket = require('../lib/bucket');
var AddressPortContact = require('../lib/contacts/address-port-contact');

describe('Bucket', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      expect(new Bucket()).to.be.instanceOf(Bucket);
    });

    it('should create an instance without the `new` keyword', function() {
      expect(Bucket()).to.be.instanceOf(Bucket);
    });

    it('should have an empty contacts list', function() {
      var bucket = new Bucket();
      expect(bucket._contacts).to.be.instanceOf(Array).and.have.lengthOf(0);
    });

  });

  describe('#getSize', function() {

    it('should return the length of the internal _contacts array', function() {
      var b1 = Bucket(), b2 = Bucket(), b3 = Bucket();
      expect(b1.getSize()).to.equal(0);
      b2._contacts.push(1);
      expect(b2.getSize()).to.equal(1);
      b3._contacts.push(1);
      b3._contacts.push(2);
      b3._contacts.push(3);
      expect(b3.getSize()).to.equal(3);
    });

  });

  describe('#getContactList', function() {

    it('should return a copy of the contacts', function() {
      var b = Bucket();
      b._contacts.push(1);
      b._contacts.push(2);
      b._contacts.push(3);
      var copy = b.getContactList();
      expect(copy).to.have.lengthOf(b._contacts.length);
      expect(JSON.stringify(copy)).to.equal(JSON.stringify(b._contacts));
      expect(copy).to.not.equal(b._contacts);
    });

  });

  describe('#getContact', function() {

    it('should return the contact at the supplied index', function() {
      var b = Bucket();
      b._contacts.push(1);
      expect(b.getContact(0)).to.equal(1);
    });

    it('should not return any contact', function() {
      var b = Bucket();
      expect(b.getContact(0)).to.equal(null);
    });

  });

  describe('#addContact', function() {

    var bucket = new Bucket();
    var contact = new AddressPortContact({ address: '0.0.0.0', port: 1337 });

    it('should add the contact to the bucket', function() {
      expect(bucket.getSize()).to.equal(0);
      bucket.addContact(contact);
      expect(bucket.getSize()).to.equal(1);
      expect(bucket.getContact(0)).to.equal(contact);
    });

    it('should throw with invalid contact object', function() {
      expect(function() {
        bucket.addContact({ address: '0.0.0.3', port: 1337 });
      }).to.throw(Error, 'Invalid contact supplied');
    });

    it('should not add the duplicate contact to the bucket', function() {
      expect(bucket.getSize()).to.equal(1);
      bucket.addContact(contact);
      expect(bucket.getSize()).to.equal(1);
    });

  });

  describe('#removeContact', function() {

    var bucket = new Bucket();

    bucket.addContact(AddressPortContact({ address: '0.0.0.0', port: 1337 }));
    bucket.addContact(AddressPortContact({ address: '0.0.0.1', port: 1337 }));
    bucket.addContact(AddressPortContact({ address: '0.0.0.2', port: 1337 }));

    it('should remove the given contact', function() {
      expect(bucket.getSize()).to.equal(3);
      var contact = AddressPortContact({ address: '0.0.0.0', port: 1337 });
      bucket.removeContact(contact);
      expect(bucket.getSize()).to.equal(2);
    });

    it('should throw with invalid contact object', function() {
      expect(function() {
        bucket.removeContact({ address: '0.0.0.3', port: 1337 });
      }).to.throw(Error, 'Invalid contact supplied');
    });

    it('should do nothing if contact is not found', function() {
      expect(bucket.getSize()).to.equal(2);
      var contact = AddressPortContact({ address: '0.0.0.3', port: 1337 });
      bucket.removeContact(contact);
      expect(bucket.getSize()).to.equal(2);
    });


  });

  describe('#hasContact', function() {

    var contact = AddressPortContact({ address: '0.0.0.0', port: 80 });
    var bucket = Bucket().addContact(contact);

    it('should return true because the contact exists', function() {
      var otherContact = AddressPortContact({ address: '0.0.0.0', port: 80 });
      expect(bucket.hasContact(otherContact.nodeID)).to.equal(true);
    });

    it('should return true because the contact does not exist', function() {
      var otherContact = AddressPortContact({ address: '0.0.0.0', port: 81 });
      expect(bucket.hasContact(otherContact.nodeID)).to.equal(false);
    });

  });

  describe('#indexOf', function() {

    var contact = AddressPortContact({ address: '0.0.0.0', port: 80 });
    var bucket = Bucket().addContact(contact);

    it('should return the index of the given contact object', function() {
      var otherContact = AddressPortContact({ address: '0.0.0.0', port: 80 });
      expect(bucket.indexOf(otherContact)).to.equal(0);
    });

    it('should return -1 for the missing contact object', function() {
      var otherContact = AddressPortContact({ address: '0.0.0.0', port: 81 });
      expect(bucket.indexOf(otherContact)).to.equal(-1);
    });

  });

});
