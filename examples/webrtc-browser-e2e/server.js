#!/usr/bin/env node

'use strict';

var http = require('http');
var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var signaller = new EventEmitter();
var WebSocketServer = require('ws').Server;
var port = 8080;
var server = require('http').createServer().listen(port);
var ws = new WebSocketServer({ server: server });

ws.on('connection', function(connection) {

  console.log('WebSocketServer connection');

  connection.on('message', function(data) {

    console.log()
    console.log('websocket message', new Date(), data);

    var parsed = JSON.parse(data);
    if(parsed.recipient && parsed.message) {
      return signaller.emit(parsed.recipient, parsed.message);
    }

    signaller.on(parsed.announceNick, function(message) {
      var json = JSON.stringify(message);
      console.log('websocket sending', json, 'to', parsed.announceNick);
      connection.send(json);
    });

    connection.on('close', function() {
      signaller.removeAllListeners(parsed.announceNick);
    });
  });
});

server.on('request', function(req, res) {
  var filePath = __dirname + '/../..' + req.url;
  fs.readFile(filePath, function(err, file) {
    if(err) {
      var message = 'invalid file: ' + filePath;
      console.log(message);
      res.statusCode = 404;
      return res.end(message);
    }
    var extension = path.extname(filePath).substring(1);
    console.log('serving', filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/' + extension);
    res.setHeader('Content-Length', file.length);
    res.end(file);
  });
});

console.log('listening on port', port);
