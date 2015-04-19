Kad
===

[![Build Status](https://travis-ci.org/gordonwritescode/kad.svg?branch=master)](https://travis-ci.org/gordonwritescode/kad)
[![Coverage Status](https://coveralls.io/repos/gordonwritescode/kad/badge.svg)](https://coveralls.io/r/gordonwritescode/kad)

An implementation of the Kademlia DHT for Node.

## Usage

Install with NPM.

```bash
npm install kad
```

Create your node, plugin your storage adapter, and join the network.

```js
var kademlia = require('kad');
var levelup = require('levelup');

var dht = kademlia({
  address: '127.0.0.1',
  port: 65535,
  seeds: [
    { address: 'some.remote.host', port: 65535 }
  ],
  storage: levelup('path/to/db')
});
```

Then party.

```js
dht.on('connect', function() {

  dht.put('beep', 'boop', function(err) {
    dht.get('beep', function(err, value) {
      console.log(value); // 'boop'
    });
  });

});
```

## Persistence

Kad does not make assumptions about how your nodes will store their data,
instead relying on you to implement a storage adapter of your choice. This is
as simple as providing `get(key, callback)`, `put(key, value, callback)`,
`del(key, callback)`, `createReadStream()` methods.

This works well with [LevelUp](https://github.com/rvagg/node-levelup), but you
could conceivably implement any storage layer you like provided you expose the
interface described above.

## License

Copyright (C) 2015 Gordon Hall

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
