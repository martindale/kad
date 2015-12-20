Class: Message(spec)
====================

Represents a [JSON-RPC 2.0](http://www.jsonrpc.org/specification) request or
response; used by `rpc.send()`.

## message.serialize()

Returns a `Buffer` representation of the JSON serialized message.

Message.isRequest(message)
==========================

Returns a boolean indicating if the given message is a request.

Message.isResponse(message)
===========================

Returns a boolean indicating if the given message is a response.

Message.fromBuffer(buffer)
==========================

Returns an instance of `Message` from the given `Buffer`.

Message.createID()
==================

Generates a random message identifier string and returns it.
