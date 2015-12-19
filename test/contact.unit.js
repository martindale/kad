'use strict';

var utils = require('../lib/utils');
var Contact = require('../lib/contact');
var expect = require('chai').expect;

describe('Contact', function() {

  describe('@constructor', function() {

    it('should create instance with the new keyword', function() {
      expect(new Contact({
        nodeID: utils.createID('test')
      })).to.be.instanceOf(Contact);
    });

    it('should create instance without the new keyword', function() {
      expect(Contact({
        nodeID: utils.createID('test')
      })).to.be.instanceOf(Contact);
    });

  });

  describe('#_createNodeID', function() {

    it('should throw an error if unimplemented', function() {
      expect(function() {
        Contact({});
      }).to.throw(Error);
    });

  });

});
