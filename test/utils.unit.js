'use strict';

var sinon = require('sinon');
var expect = require('chai').expect;
var constants = require('../lib/constants');
var hat = require('hat');
var _ = require('lodash');
var faker = require('faker');
var utils = require('../lib/utils');

describe('Utils', function() {

  describe('#isValidKey', function() {

    it('should return false for invalid key', function() {
      expect(utils.isValidKey('blahblahblah')).to.equal(false);
    });

    it('should return true for a valid key', function() {
      expect(utils.isValidKey(hat(constants.B))).to.equal(true);
    });

  });

  describe('#createID', function() {

    it('should return a string', function() {
      expect(typeof utils.createID('data')).to.equal('string');
    });

    it('should have length of K * 2', function() {
      expect(utils.createID('data')).to.have.length(constants.K * 2);
    });

  });

  describe('#hexToBuffer', function() {

    it('should return a buffer', function() {
      expect(utils.hexToBuffer('0123456789abcdef')).to.be.instanceOf(Buffer);
    });

    it('should only accept hex', function() {
      expect(function() {
        utils.hexToBuffer('abcdefg');
      }).to.throw(Error);
    });

  });

  describe('#getDistance', function() {

    it('should correctly calculate distance', function() {
      var result1 = utils.hexToBuffer(
        '0000000000000000000000000000000000000001'
      );
      var result2 = utils.hexToBuffer(
        '0070000000000000000000000000000000000001'
      );
      expect(utils.getDistance(
        'ffbfba8945192d408d3dcc52ba24903a00000000',
        'ffbfba8945192d408d3dcc52ba24903a00000001'
      )).to.deep.equal(result1);
      expect(utils.getDistance(
        'ffcfba8945192d408d3dcc52ba24903a00000000',
        'ffbfba8945192d408d3dcc52ba24903a00000001'
      )).to.deep.equal(result2);
    });

    it('should throw when keys are invalid', function() {
      expect(function() {
        utils.getDistance('bad', 'ffbfba8945192d408d3dcc52ba24903a00000001');
      }).to.throw(Error);
      expect(function() {
        utils.getDistance('ffbfba8945192d408d3dcc52ba24903a00000001', 'bad');
      }).to.throw(Error);
    });
  });

  describe('#compareKeys', function() {

    it('should return -1 for the given comparisons', function() {
      expect(utils.compareKeys(
        '1fbfba8945192d408dcdcc52b924903a328f0587',
        '1fbfba8945192d408dcdcc52b924903a328f0588'
      )).to.equal(-1);
      expect(utils.compareKeys(
        '1fbfba8945192d408d3dcc52ba24903a328f0586',
        '1fbfba8945192d408dcdcc52b924903a328f0586'
      )).to.equal(-1);
    });

    it('should return 1 for the given comparisons', function() {
      expect(utils.compareKeys(
        '1fbfba8945192d408dcdcc52b924903a328f0588',
        '1fbfba8945192d408dcdcc52b924903a328f0587'
      )).to.equal(1);
      expect(utils.compareKeys(
        '1fbfba8945192d408dcdcc52ba24903a328f0586',
        '1fbfba8945192d408dcdcc52b924903a328f0586'
      )).to.equal(1);
    });

    it('should return 0 for the given comparisons', function() {
      expect(utils.compareKeys(
        '1fbfba8945192d408dcdcc52b924903a328f0588',
        '1fbfba8945192d408dcdcc52b924903a328f0588'
      )).to.equal(0);
    });

  });

  describe('#getBucketIndex', function() {

    it('should return the proper bucket index', function() {
      expect(utils.getBucketIndex(
        'ffbfba8945192d408d3dcc52ba24903a00000000',
        'ffbfba8945192d408d3dcc52ba24903a00000001'
      )).to.equal(0);
      expect(utils.getBucketIndex(
        'ffcfba8945192d408d3dcc52ba24903a00000000',
        'ffbfba8945192d408d3dcc52ba24903a00000001'
      )).to.equal(150);
      expect(utils.getBucketIndex(
        utils.createID('beep'),
        utils.createID('boop')
      )).to.equal(159);
    });

    it('should return B if distance is 0', function() {
      var _getDistance = sinon.stub(utils, 'getDistance').returns(0);
      expect(utils.getBucketIndex(
        'ffbfba8945192d408d3dcc52ba24903a00000000',
        'ffbfba8945192d408d3dcc52ba24903a00000001'
      )).to.equal(160);
      _getDistance.restore();
    });

    it('should not collide', function() {
      this.timeout(3000);
      for (var i = 0; i < 10000; i++) {
        var id1 = utils.createID(faker.lorem.sentence());
        var id2 = utils.createID(faker.lorem.sentence());
        expect(utils.getBucketIndex(id1, id2)).to.not.equal(constants.B);
      }
    });

    it('should throw when key is invalid', function() {
      expect(function() {
        utils.getBucketIndex('ffbfba8945192d408d3dcc52ba24903a00000001', 'bad');
      }).to.throw(Error);
      expect(function() {
        utils.getBucketIndex('ffbfba8945192d408d3dcc52ba24903a00000001', 'bad');
      }).to.throw(Error);
    });

  });

  describe('#getPowerOfTwoBuffer', function() {

    it('should stay within range', function() {
      expect(function() {
        utils.getPowerOfTwoBuffer(constants.B + 1);
      }).to.throw(Error);
      expect(function() {
        utils.getPowerOfTwoBuffer(-1);
      }).to.throw(Error);
      expect(function() {
        utils.getPowerOfTwoBuffer(5);
      }).to.not.throw(Error);
    });

    it('should calculate the correct value', function() {
      function makeBuffer() {
        var b = new Buffer(constants.K);
        b.fill(0);
        return b;
      }

      var testCalculation = function(exp, byteIndex, value) {
        var b = makeBuffer();
        b[byteIndex] = value;

        var test = utils.getPowerOfTwoBuffer(exp);
        expect(b.length).to.equal(test.length);
        for (var i = 0; i < b.length; i++) {
          expect(b[i]).to.equal(test[i]);
        }
      };

      testCalculation(0, 19, 1);
      testCalculation(159, 0, 0x80);
      testCalculation(155, 0, 0x08);
      testCalculation(10, 18, 0x04);
      testCalculation(16, 17, 0x01);
    });

  });

  describe('#getRandomInBucketRangeBuffer', function() {

    this.timeout(5000);

    it('should get a random bucket within the range', function() {
      function checkZero(buffer, limit) {
        for (var i = 0; i < limit; i++) {
          expect(buffer[i]).to.equal(0);
        }
      }

      function test(n) {
        var limit = constants.K - (parseInt(n / 8) + 1);
        var pow = Math.pow(2, n % 8 + 1);

        for (var i = 0; i < 500; i++) {
          var num = utils.getRandomInBucketRangeBuffer(n);
          checkZero(num, limit);
          expect(num[limit] < pow).to.equal(true);
        }
      }

      _.range(0, constants.B).forEach(function(i) {
        test(i);
      });
    });

  });

});
