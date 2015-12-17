'use strict';

var expect = require('chai').expect;
var Item = require('../lib/item');
var utils = require('../lib/utils');

describe('Item', function() {

  describe('@constructor', function() {

    var publisher = utils.createID('0.0.0.0:1337');

    it('should create an instance with the `new` keyword', function() {
      expect(
        new Item(utils.createID('beep'), 'boop', publisher)
      ).to.be.instanceOf(Item);
    });

    it('should create an instance without the `new` keyword', function() {
      expect(
        Item(utils.createID('beep'), 'boop', publisher)
      ).to.be.instanceOf(Item);
    });

    it('should throw with an invalid key', function() {
      expect(function() {
        Item(123, 'boop', publisher);
      }).to.throw(Error);
    });

    it('should throw without a value', function() {
      expect(function() {
        Item('beep', null, publisher);
      }).to.throw(Error);
    });

    it('should throw without a valid publisher', function() {
      expect(function() {
        Item(utils.createID('beep'), 'boop', '0.0.0.0:1337');
      }).to.throw(Error);
    });

    it('should use the supplied timestamp if given', function() {
      var timestamp = Date.now();
      expect(
        Item(utils.createID('beep'), 'boop', publisher, timestamp).timestamp
      ).to.equal(timestamp);
    });

    it('should throw if timestamp is in the future', function() {
      expect(function() {
        Item(
          utils.createID('beep'),
          'boop',
          '0.0.0.0:1337',
          new Date('3000-1-1').getTime()
        );
      }).to.throw(Error);
    });

  });

});
