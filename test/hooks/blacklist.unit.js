'use strict';

var expect = require('chai').expect;
var BlacklistFactory = require('../../lib/hooks/blacklist');
var Message = require('../../lib/message');
var AddressPortContact = require('../../lib/contacts/address-port-contact');

describe('Hooks/Blacklist', function() {

  var node1 = AddressPortContact({
    address: '127.0.0.1',
    port: 8080
  });
  var node2 = AddressPortContact({
    address: '127.0.0.1',
    port: 8081
  });
  var blacklist = BlacklistFactory([node1.nodeID]);

  it('should pass an error if contact is in the blacklist', function(done) {
    blacklist(Message({
      method: 'PING',
      params: {
        contact: node1
      },
      id: 'message1'
    }), node1, function(err) {
      expect(err).to.be.instanceOf(Error);
      done();
    });
  });

  it('should pass if contact is not in the blacklist', function(done) {
    blacklist(Message({
      method: 'PING',
      params: {
        contact: node2
      },
      id: 'message1'
    }), node2, function(err) {
      expect(err).to.equal(undefined);
      done();
    });
  });

});
