'use strict';

var expect = require('chai').expect;
var constants = require('../lib/constants');
var Message = require('../lib/message');
var Contact = require('../lib/contact');

describe('Message', function() {

  describe('@constructor', function() {

    var contact = new Contact('0.0.0.0', 1337);

    it('should create an instance with the `new` keyword', function() {
      expect(new Message('PING', {}, contact)).to.be.instanceOf(Message);
    });

    it('should create an instance without the `new` keyword', function() {
      expect(Message('PING', {}, contact)).to.be.instanceOf(Message);
    });

    it('should throw with invalid message type', function() {
      expect(function() {
        Message('SOMETHING_WRONG', {}, contact);
      }).to.throw(Error, 'Invalid message type');
    });

    it('should throw with invalid contact', function() {
      expect(function() {
        Message('PING', {}, '0.0.0.0:1337');
      }).to.throw(Error, 'Invalid contact supplied');
    });

  });

  describe('#serialize', function() {

    var contact = new Contact('0.0.0.0', 1337);

    it('should return a buffer ready for sending', function() {
      var msg = new Message('PING', {}, contact);
      expect(msg.serialize()).to.be.instanceOf(Buffer);
    });

    it('should return a buffer with the same length as json', function() {
      var msg = Message('PING', {}, contact);
      var smsg = msg.serialize()
      expect(smsg).to.have.lengthOf(JSON.stringify(msg).length);
    });

  });

});
