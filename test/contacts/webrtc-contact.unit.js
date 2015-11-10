'use strict';

var expect = require('chai').expect;
var constants = require('../../lib/constants');
var crypto = require('crypto');
var WebRTCContact = require('../../lib/contacts/webrtc-contact');
var hat = require('hat');

describe('WebRTCContact', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      var c = new WebRTCContact({ nick: 'a' });
      expect(c).to.be.instanceOf(WebRTCContact);
    });

    it('should create an instance without the `new` keyword', function() {
      var c = WebRTCContact({ nick: 'a' });
      expect(c).to.be.instanceOf(WebRTCContact);
    });

    it('should throw without a nick', function() {
      expect(function() {
        WebRTCContact({});
      }).to.throw(Error, 'Invalid nick was supplied');
    });

    it('should use the given nodeID instead of generating one', function() {
      var i = hat(constants.B)
      var c = WebRTCContact({ nick: 'a', nodeID: i });
      expect(c.nodeID).to.equal(i);
    });

    it('should throw with an invalid supplied nodeID', function() {
      expect(function() {
        var i = hat(24)
        var opts = { nick: 'a', nodeID: i };
        var c = WebRTCContact(opts);
      }).to.throw(Error, 'Invalid nodeID was supplied');
    });

  });

  describe('#seen', function() {

    it('should update the lastSeen property', function() {
      var c = WebRTCContact({ nick: 'a' });
      var s1 = c.lastSeen;
      setTimeout(function() {
        c.seen();
        expect((c.lastSeen - s1) >= 10).to.equal(true);
      }, 10);
    });

  });

  describe('#_createNodeID', function() {

    it('should compute the SHA1 digest of the address and port', function() {
      var c = WebRTCContact({ nick: 'a' });
      var i = crypto.createHash('sha1').update('a');
      expect(c._createNodeID()).to.equal(i.digest('hex'));
    });

  });

});
