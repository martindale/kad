'use strict';

var expect = require('chai').expect;
var constants = require('../lib/constants');
var crypto = require('crypto');
var Contact = require('../lib/contact');
var hat = require('hat');

describe('Contact', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      expect(new Contact('0.0.0.0', 1337)).to.be.instanceOf(Contact);
    });

    it('should create an instance without the `new` keyword', function() {
      expect(Contact('0.0.0.0', 1337)).to.be.instanceOf(Contact);
    });

    it('should throw without an address', function() {
      expect(function() {
        Contact(null, 1337);
      }).to.throw(Error, 'Invalid address was supplied');
    });

    it('should throw without a port', function() {
      expect(function() {
        Contact('0.0.0.0');
      }).to.throw(Error, 'Invalid port was supplied');
    });

    it('should use the given nodeID instead of generating one', function() {
      var i = hat(constants.B)
      var c = Contact('0.0.0.0', 1337, i);
      expect(c.nodeID).to.equal(i);
    });

    it('should throw with an invalid supplied nodeID', function() {
      expect(function() {
        var i = hat(24)
        var c = Contact('0.0.0.0', 1337, i);
      }).to.throw(Error, 'Invalid nodeID was supplied');
    });

  });

  describe('#seen', function() {

    it('should update the lastSeen property', function() {
      var c = Contact('0.0.0.0', 1337);
      var s1 = c.lastSeen.toString();
      setTimeout(function() {
        c.seen();
        expect((c.lastSeen - Number(s1)) >= 10).to.equal(true);
      }, 10);
    });

  });

  describe('#_createNodeID', function() {

    it('should compute the SHA1 digest of the address and port', function() {
      var c = Contact('0.0.0.0', 1337);
      var i = crypto.createHash('sha1').update(c.address + ':' + c.port);
      expect(c._createNodeID()).to.equal(i.digest('hex'));
    });

  });

});
