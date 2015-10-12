webrtc-browser-e2e
==================

A signal server is needed to perform a WebRTC handshake
and initiate the peer-to-peer connection.
This example demonstrates end-to-end connectivity with a signal server.

## Running the example

To start the signal server, do

    node examples/webrtc-browser-e2e/server.js

Then, in your browser navigate to

    http://localhost:8080/examples/webrtc-browser-e2e/index.html

## Explanation

This will start two nodes which will use the signal server to
initiate a peer-to-peer connection.

These two nodes could sit in different browsers on different computers.

For simplicity's sake, the code runs in a single browser session.
