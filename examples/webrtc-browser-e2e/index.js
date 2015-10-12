'use strict';

var kademlia = require('../..');
var KadLocalStorage = require('kad-localstorage');
var webSocket = require('./web-socket');
var SignalClient = require('./signal-client');
var EventEmitter = require('events').EventEmitter;
var signalClient1 = new SignalClient('node1');
var signalClient2 = new SignalClient('node2');

webSocket.on('open', function() {

  // Create our first node
  var node1 = kademlia({
    transport: kademlia.transports.WebRTC,
    nick: 'node1',
    signaller: signalClient1,
    storage: new KadLocalStorage('node1')
  });

  // Create a second node
  var node2 = kademlia({
    transport: kademlia.transports.WebRTC,
    nick: 'node2',
    signaller: signalClient2,
    storage: new KadLocalStorage('node2'),
    seeds: [{ nick: 'node1' }] // Connect to the first node
  });

  node2.on('connect', onConnect);

  function onConnect() {
    node1.put('beep', 'boop', onPut);
  }

  function onPut(err) {
    node2.get('beep', onGet);
  }

  function onGet(err, value) {
    alert(value); // 'boop'
  }

});
