Class: Message(spec)
====================

Represents a [JSON-RPC 2.0](http://www.jsonrpc.org/specification) request or
response; used by `rpc.send()`.

Note that the value of the `contact` property will be replaced by the `Contact`
your implementation uses; the examples below assume you are using the included
`AddressPortContact`.

The decision to use JSON-RPC as the message format was made to allow for other
language implementations and services to easily communicate with the network,
using a widely recognized and used format.

> It **is** possible, though not recommended, to overload the `kad.Message`
> class with your own format, however you must handle serialization to/from the
> expected JSON-RPC format before/after messages get passed to `kad.Node` for
> handling.

## message.serialize()

Returns a `Buffer` representation of the JSON serialized message.

---

## Protocol Specification

### PING

Request:

```json
{
  "method": "PING",
  "params": {
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

Response:

```json
{
  "result": {
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

### STORE

Request:

```json
{
  "method": "STORE",
  "params": {
    "item": {
      "key": "<key>",
      "value": "<value>",
      "timestamp": 1450715749709,
      "publisher": "<node_id>"
    },
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

Response:

```json
{
  "result": {
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

### FIND_NODE

Request:

```json
{
  "method": "FIND_NODE",
  "params": {
    "key": "<key>",
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

Response:

```json
{
  "result": {
    "nodes": [
      {
        "address": "<net_addr>",
        "port": 1234,
        "nodeID": "<node_id>"
      },
      {
        "address": "<net_addr>",
        "port": 1234,
        "nodeID": "<node_id>"
      },
      {
        "address": "<net_addr>",
        "port": 1234,
        "nodeID": "<node_id>"
      }
    ],
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

### FIND_VALUE

Request:

```json
{
  "method": "FIND_VALUE",
  "params": {
    "key": "<key>",
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

Response:

```json
{
  "result": {
    "item": {
      "key": "<key>",
      "value": "<value>",
      "timestamp": 1450715749709,
      "publisher": "<node_id>"
    },
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "id": "<rpc_id>"
}
```

### ERROR

```json
{
  "result": {
    "contact": {
      "address": "<net_addr>",
      "port": 1234,
      "nodeID": "<node_id>"
    }
  },
  "error": {
    "code": -32603,
    "message": "<error_message>"
  },
  "id": "<rpc_id>"
}
```

---

## Message.isRequest(message)

Returns a boolean indicating if the given message is a request.

## Message.isResponse(message)

Returns a boolean indicating if the given message is a response.

## Message.fromBuffer(buffer)

Returns an instance of `Message` from the given `Buffer`.

## Message.createID()

Generates a random message identifier string and returns it.
