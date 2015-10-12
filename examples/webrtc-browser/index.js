'use strict';

var kademlia = require('../..');
var KadLocalStorage = require('kad-localstorage');
var EventEmitter = require('events').EventEmitter;

// The two nodes share a signaller
var signaller = new EventEmitter();

// Create our first node
var node1 = kademlia({
  transport: kademlia.transports.WebRTC,
  nick: 'node1',
  signaller: signaller,
  storage: new KadLocalStorage('node1')
});

// Create a second node
var node2 = kademlia({
  transport: kademlia.transports.WebRTC,
  nick: 'node2',
  signaller: signaller,
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
