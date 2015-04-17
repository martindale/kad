Kad
===

[![Build Status](https://travis-ci.org/gordonwritescode/kad.svg?branch=master)](https://travis-ci.org/gordonwritescode/kad)
[![Coverage Status](https://coveralls.io/repos/gordonwritescode/kad/badge.svg)](https://coveralls.io/r/gordonwritescode/kad)

An implementation of the Kademlia DHT for Node.

## Usage

```bash
npm install kad
```

```js
var kademlia = require('kad');

var dht = kademlia({
  address: '127.0.0.1',
  port: 65535,
  seeds: [
    { address: 'some.remote.host', port: 65535 }
  ],
  storage: { /* { get: fn, set: fn } */ }
});

dht.on('connect', function() {

  // store a value in the DHT
  dht.set('beep', 'boop', function(err) {
    // retrieve the value from the DHT
    dht.get('beep', function(err, value) {
      console.log(value); // 'boop'
    });
  });

});
```

Kad does not make assumption about how your nodes will store their data, instead
relying on your to implement a storage adapter of your choice.

This is as simple as providing a `get()` and `set()` method. Example:

```js
function FakeStorage() {
  this.data = {};
}

FakeStorage.prototype.get = function(key, callback) {
  if (!this.data[key]) return callback(new Error('not found'));
  callback(null, this.data[key]]);
};

FakeStorage.prototype.set = function(key, value, callback) {
  this.data[key] = value;
  callback(null);
};
```

Then you give it to Kad like so:

```js
var dht = kademlia({
  // ...
  storage: new FakeStorage()
});
```

## License

Kad - an implementation of the Kademlia DHT for Node.
Copyright (C) 2015  Gordon Hall

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
