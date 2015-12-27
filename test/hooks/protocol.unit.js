'use strict';

var expect = require('chai').expect;
var ProtocolFactory = require('../../lib/hooks/protocol');
var Message = require('../../lib/message');
var AddressPortContact = require('../../lib/contacts/address-port-contact');

describe('Hooks/Protocol', function() {

  it('should pass along if the message is a response', function(done) {
    var contact = AddressPortContact({ address: '127.0.0.1', port: 8080 });
    var response = Message({ id: 'response1', result: { contact: contact } });
    var protocol = ProtocolFactory({});
    protocol(response, contact, done);
  });

  it('should pass along if the method is not defined', function(done) {
    var contact = AddressPortContact({ address: '127.0.0.1', port: 8080 });
    var request = Message({ method: 'ECHO', params: { contact: contact } });
    var protocol = ProtocolFactory({});
    protocol(request, contact, done);
  });

  it('should call the method and send the response', function(done) {
    var sender = AddressPortContact({ address: '127.0.0.1', port: 8080 });
    var request = Message({
      method: 'ECHO',
      params: { text: 'test', contact: sender }
    });
    var protocol = ProtocolFactory({
      ECHO: function(params, respond) {
        expect(params.text).to.equal('test');
        respond(null, { text: params.text });
      }
    }).bind({
      send: function(contact, message) {
        expect(contact).to.equal(sender);
        expect(message.result.text).to.equal('test');
        done();
      }
    });
    protocol(request, sender, function() {
      done(new Error('Protocol middleware did not intercept message'));
    });
  });

  it('should call the method and send the error', function(done) {
    var sender = AddressPortContact({ address: '127.0.0.1', port: 8080 });
    var request = Message({
      method: 'ECHO',
      params: { contact: sender }
    });
    var protocol = ProtocolFactory({
      ECHO: function(params, respond) {
        respond(new Error('Missing parameter: text'));
      }
    }).bind({
      send: function(contact, message) {
        expect(contact).to.equal(sender);
        expect(message.error.message).to.equal('Missing parameter: text');
        done();
      }
    });
    protocol(request, sender, function() {
      done(new Error('Protocol middleware did not intercept message'));
    });
  });

});
