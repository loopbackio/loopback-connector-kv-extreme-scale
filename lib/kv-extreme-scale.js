// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-kv-extreme-scale
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const assert = require('assert');
const connectorCore = require('loopback-connector');
const debug = require('debug')('loopback:connector:kv-extreme-scale');
const extend = require('util')._extend;
const g = require('./globalize');
const request = require('request');
const util = require('util');

const AssertionError = assert.AssertionError;
const Connector = connectorCore.Connector;
const BinaryPacker = connectorCore.BinaryPacker;
const JsonStringPacker = connectorCore.JSONStringPacker;
const ModelKeyComposer = connectorCore.ModelKeyComposer;

exports.initialize = function initializeDataSource(dataSource, callback) {
  const settings = dataSource.settings;

  dataSource.connector = new ExtremeScaleKVConnector(settings, dataSource);

  if (callback)
    setImmediate(callback);
};

exports._Connector = ExtremeScaleKVConnector;

/**
 * @constructor
 *
 * Constructor for the KeyValue ExtremeScale connector.
 *
 * @param {Object} settings
 * @param {DataSource} dataSource The data source instance.
 *
 * @header ExtremeScaleKeyValueConnector(settings, dataSource)
 */
function ExtremeScaleKVConnector(settings, dataSource) {
  Connector.call(this, 'kv-extreme-scale', settings);
  this.dataSource = dataSource;

  debug('Connector settings', settings);

  // set key expiration based on LastUpdateTime with Optimistic locking
  this._url = settings.url + '.LUT.O';

  this._queryUrl = this._url
    // convert URL like /v1/grids/GridName... to /v1/query/GridName/...
    .replace(/\/v1\/grids\//, '/v1/query/')
    // drop trailing slash, because such URLs are not supported by XS
    .replace(/\/$/, '');

  this._strictSSL = settings.strictSSL;
  this._cookieJar = request.jar();

  switch (settings.packer) {
    case 'binary':
      this._packer = new BinaryPacker();
      this._contentType = 'application/octet-stream';
      break;
    case 'json':
    case undefined:
      this._packer = new JsonStringPacker();
      this._contentType = 'application/json';
      break;
    default:
      throw new AssertionError(
        'Unknown packer ' + JSON.stringify(settings.packer));
  }

  this.DataAccessObject = dataSource.juggler.KeyValueAccessObject;
};

util.inherits(ExtremeScaleKVConnector, Connector);

/**
 * Persist a value and associate it with the given key.
 *
 * @param {String} modelName The model name to associate with the given key.
 * @param {String} key Key to associate with the given value.
 * @param {*} value Value to persist.
 * @options {Object} options
 * @property {Number} ttl TTL (time to live) for the key-value pair in ms
 *   (milliseconds).
 * @callback {Function} callback
 * @param {Error} err Error object.
 *
 * @header ExtremeScaleKeyValueConnector.prototype.set(modelName, key, value, cb)
 */
ExtremeScaleKVConnector.prototype.set =
function(modelName, key, value, options, callback) {
  ModelKeyComposer.compose(modelName, key, (err, composedKey) => {
    if (err) return callback(err);

    debug('POST %j %j (%j)', composedKey, value, options);
    this._packer.encode(value, (err, body) => {
      if (err) return callback(err);

      if (options.ttl) {
        this._set(composedKey, body, options.ttl, callback);
      } else {
        const NO_TTL = undefined;

        // ExtremeScale's REST API does not allow unsetting TTL value
        // The workaround is to delete the key first
        this._clear(composedKey, (err) => {
          debug(
            'Warning: cannot delete the key %s before setting a new value. %s',
            composedKey, err);
          this._set(composedKey, body, NO_TTL, callback);
        });
      }
    });
  });
};

ExtremeScaleKVConnector.prototype._set =
function(composedKey, body, ttl, callback) {
  const requestOptions = {
    uri: '/' + encodeURIComponent(composedKey),
    method: 'POST',
    qs: {ttl: ttl ? +ttl / 1000 : undefined},
    body: body,
    headers: {
      'content-type': this._contentType,
    },
  };

  this.request(requestOptions, (err, res, body) => {
    callback(err);
  });
};

ExtremeScaleKVConnector.prototype._clear = function(composedKey, callback) {
  const requestOptions = {
    uri: '/' + encodeURIComponent(composedKey),
    method: 'DELETE',
  };

  this.request(requestOptions, callback);
};

/**
 * Return the value associated with a given key.
 *
 * @param {String} modelName The model name to associate with the given key.
 * @param {String} key Key to use when searching the database.
 * @options {Object} options
 * @callback {Function} callback
 * @param {Error} err Error object.
 * @param {*} result Value associated with the given key.
 *
 * @header ExtremeScaleKeyValueConnector.prototype.get(modelName, key, cb)
 */
ExtremeScaleKVConnector.prototype.get =
function(modelName, key, options, callback) {
  ModelKeyComposer.compose(modelName, key, (err, composedKey) => {
    if (err) return callback(err);

    this._get(composedKey, (err, body) => {
      if (err) return callback(err);
      if (body === null) {
        debug('GET %j -> (404 Not Found)', composedKey);
        return callback(null, null);
      }
      this._packer.decode(body, (err, data) => {
        if (err) return callback(err);
        debug('GET %j -> %j', composedKey, data);
        callback(null, data);
      });
    });
  });
};

ExtremeScaleKVConnector.prototype._get = function(composedKey, callback) {
  const requestOptions = {
    uri: '/' + encodeURIComponent(composedKey),
    method: 'GET',
    encoding: null, // get the body as a raw Buffer
  };

  this.request(requestOptions, (err, res, body) => {
    if (err && err.statusCode === 404 && /^CWOBJ9752E/.test(err.message)) {
      // key not found
      err = null;
      body = null;
    }

    return callback(err, body, res && res.headers);
  });
};

/**
 * Set the TTL (time to live) in ms (milliseconds) for a given key. TTL is the
 * remaining time before a key-value pair is discarded from the database.
 *
 * @param {String} modelName The model name to associate with the given key.
 * @param {String} key Key to use when searching the database.
 * @param {Number} ttl TTL in ms to set for the key.
 * @options {Object} options
 * @callback {Function} callback
 * @param {Error} err Error object.
 *
 * @header ExtremeScaleKeyValueConnector.prototype.expire(modelName, key, ttl, cb)
 */
ExtremeScaleKVConnector.prototype.expire =
function(modelName, key, ttl, options, callback) {
  const err = new Error(
    'ExtremeScale connector does not support "expire" method');
  err.statusCode = 501;
  callback(err);
};

/**
 * Return the TTL (time to live) for a given key. TTL is the remaining time
 * before a key-value pair is discarded from the database.
 *
 * @param {String} modelName The model name to associate with the given key.
 * @param {String} key Key to use when searching the database.
 * @options {Object} options
 * @callback {Function} callback
 * @param {Error} error
 * @param {Number} ttl Expiration time for the key-value pair. `undefined` if
 *   TTL was not initially set.
 *
 * @header ExtremeScaleKeyValueConnector.prototype.ttl(modelName, key, cb)
 */
ExtremeScaleKVConnector.prototype.ttl =
function(modelName, key, options, callback) {
  const err = new Error(
    'ExtremeScale connector does not support "ttl" method');
  err.statusCode = 501;
  callback(err);
};

/**
 * Asynchronously iterate all keys in the database. Similar to `.keys()` but
 * instead allows for iteration over large data sets without having to load
 * everything into memory at once.
 *
 * @param {String} modelName The model name to associate with the given key.
 * @param {Object} filter An optional filter object with the following
 * @param {String} filter.match Glob string to use to filter returned
 *   keys (i.e. `userid.*`).
 * @param {Object} options
 * @returns {AsyncIterator} An Object implementing `next(cb) -> Promise`
 *   function that can be used to iterate all keys.
 *
 * @header ExtremeScaleKeyValueConnector.prototype.iterateKeys(modelName, filter)
 */
ExtremeScaleKVConnector.prototype.iterateKeys =
function(modelName, filter, options) {
  const self = this;
  const KEY_QUERY = globToRegexp(filter.match || '*');

  let cache;

  return {
    next: getNextKey,
  };

  function getNextKey(callback) {
    if (!cache)
      return fetchFirst500Keys(callback);

    if (!cache.length)
      return reportEnd(callback);

    takeNextFromCache(callback);
  }

  function takeNextFromCache(callback) {
    const value = cache.shift();

    ModelKeyComposer.parse(value, (err, parsed) => {
      if (err && err.code == 'NO_MODEL_PREFIX') {
        err = null;
        parsed = {modelName: null, key: value};
      }

      if (err) return cb(err);

      if (parsed.modelName !== modelName) {
        g.warn(
          'Warning: key scan returned a key beloging to a wrong model.' +
            '\nExpected model name: %j' +
            '\nActual model name:   %j' +
            '\nThe key: %j',
          modelName, parsed.modelName, value);
      }

      callback(null, parsed.key);
    });
  }

  function reportEnd(callback) {
    setImmediate(callback);
  }

  function fetchFirst500Keys(callback) {
    ModelKeyComposer.compose(modelName, KEY_QUERY, (err, pattern) => {
      if (err) return callback(err);
      self._query(pattern, (err, body) => {
        if (err) return callback(err);
        cache = body.items.map(it => it.key);
        getNextKey(callback);
      });
    });
  }
};

ExtremeScaleKVConnector.prototype._query = function(query, callback) {
  const requestOptions = {
    baseUrl: this._queryUrl,
    uri: '/',
    method: 'GET',
    qs: {query: query},
    json: true,
  };

  this.request(requestOptions, (err, res, body) => {
    callback(err, body);
  });
};

ExtremeScaleKVConnector.prototype.request = function(options, callback) {
  options = extend({
    baseUrl: this._url,
    strictSSL: this._strictSSL,
    jar: this._cookieJar,
  }, options);

  debug('request %j', options);
  request(options, function handleErrorResponse(err, res, body) {
    if (err) {
      debug('err', err);
      return callback(err);
    }

    if (res.statusCode / 100 !== 2) {
      debug('err code=%s body=%j',
        res.statusCode,
        (body instanceof Buffer ? body.toString() : body));
      return callback(createErrorFromResponse(res, body));
    }

    debug('success (%s), body=%s', res.statusCode, body);
    callback(null, res, body);
  });
};

function createErrorFromResponse(res, body) {
  debug('%s %s %j', res.statusCode, res.statusMessage, body);
  if (body instanceof Buffer) {
    body = body.toString();
  }

  // We cannot rely on Content-Type response header as the server
  // returns "application/atom+xml" (??)
  const looksLikeJsonString = typeof body === 'string' &&
    body[0] === '{' &&
    body[body.length - 1] === '}';
  if (looksLikeJsonString) {
    try {
      body = JSON.parse(body);
    } catch (err) {
      debug('Cannot parse JSON response %j', body);
    }
  }

  const msg = body && body.error || body ||
    res.statusCode + ' ' + res.statusMessage;
  const err = new Error(msg);
  err.statusCode = res.statusCode;
  return err;
}

function globToRegexp(value) {
  return value
    // escape regexp
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    // convert \* to .*
    .replace(/\\\*/g, '.*')
    // convert \? to .
    .replace(/\\\?/g, '.');
}
