webrtc-node
===========

The WebRTC transport can be run directly from Node.
To do so, you must pass the `wrtc` package during initialization.

A signal server is needed to perform a WebRTC handshake
and initiate the peer-to-peer connection.
For this example, we just use an `EventEmitter` in place of a signal server.
For an end-to-end example of a signal server,
checkout the `webrtc-browser-e2e` example.

## Running the example

Just do

    node examples/webrtc-node/index.js
