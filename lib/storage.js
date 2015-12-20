/**
 * @module kad/storage
 */

'use strict';

/**
 * Metapackage for common Kad storage adapters
 * #exports
 */
module.exports = {
  FS: require('kad-fs'),
  LocalStorage: require('kad-localstorage')
};
