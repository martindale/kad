'use strict';

var expect = require('chai').expect;
var AddressPortContact = require('../lib/contacts/address-port-contact');
var RPC = require('../lib/rpc');
var inherits = require('util').inherits;

function FakeTransport(contact, options) {
  RPC.call(this, contact, options);
}

inherits(FakeTransport, RPC);

FakeTransport.prototype._createContact = function(options) {
  return new AddressPortContact(options);
};

describe('RPC', function() {

  describe('#_createContact', function() {

    it('should use replyto if it exists', function() {
      var rpc = new FakeTransport({
        address: '0.0.0.0',
        port: 8080
      }, {
        replyto: {
          address: 'mydomain.tld',
          port: 80
        }
      });
      expect(rpc._contact.address).to.equal('mydomain.tld');
      expect(rpc._contact.port).to.equal(80);
    });

  });

});
