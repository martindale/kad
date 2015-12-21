'use strict';

var expect = require('chai').expect;
var Message = require('../lib/message');
var AddressPortContact = require('../lib/contacts/address-port-contact');

describe('Message', function() {

  describe('@constructor', function() {

    var contact = new AddressPortContact({ address: '0.0.0.0', port: 1337 });

    it('should create an instance with the `new` keyword', function() {
      expect(new Message({
        method: 'PING',
        params: { contact: contact },
      })).to.be.instanceOf(Message);
    });

    it('should create an instance without the `new` keyword', function() {
      expect(Message({
        method: 'PING',
        params: { contact: contact },
      })).to.be.instanceOf(Message);
    });

  });

  describe('#serialize', function() {

    var contact = new AddressPortContact({ address: '0.0.0.0', port: 1337 });

    it('should return a buffer ready for sending', function() {
      var msg = new Message({
        method: 'PING',
        params: { contact: contact },
      });
      expect(msg.serialize()).to.be.instanceOf(Buffer);
    });

    it('should return a buffer with the same length as json', function() {
      var msg = Message({
        method: 'PING',
        params: { contact: contact },
      });
      var smsg = msg.serialize();
      expect(smsg).to.have.lengthOf(JSON.stringify(msg).length);
    });

  });

});
