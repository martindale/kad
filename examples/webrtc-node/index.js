#!/usr/bin/env node

'use strict';

var kademlia = require('../..');
var levelup = require('levelup');
var EventEmitter = require('events').EventEmitter;
var wrtc = require('wrtc');

// The two nodes share a signaller
var signaller = new EventEmitter();

// Create our first node
var node1 = kademlia({
  transport: kademlia.transports.WebRTC,
  nick: 'node1',
  signaller: signaller,
  storage: levelup('node1'),
  wrtc: wrtc // When running in Node, we have to pass the wrtc package
});

// Create a second node
var node2 = kademlia({
  transport: kademlia.transports.WebRTC,
  nick: 'node2',
  signaller: signaller,
  storage: levelup('node2'),
  seeds: [{ nick: 'node1' }], // Connect to the first node
  wrtc: wrtc // When running in Node, we have to pass the wrtc package
});

node2.on('connect', onNode2Ready);

function onNode2Ready() {
  node1.put('beep', 'boop', onPut);
}

function onPut(err) {
  node2.get('beep', onGet);
}

function onGet(err, value) {
  console.log(value); // 'boop'
}
