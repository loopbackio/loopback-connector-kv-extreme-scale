'use strict';

var assert = require('assert');
var connectorCore = require('loopback-connector');
var debug = require('debug')('loopback:connector:kv-extreme-scale');
var extend = require('util')._extend;
var request = require('request');
var util = require('util');

var Connector = connectorCore.Connector;
var BinaryPacker = connectorCore.BinaryPacker;
var ModelKeyComposer = connectorCore.ModelKeyComposer;

exports.initialize = function initializeDataSource(dataSource, callback) {
  var settings = dataSource.settings;

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
  this._packer = new BinaryPacker();
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
  var self = this;
  ModelKeyComposer.compose(modelName, key, function(err, composedKey) {
    if (err) return callback(err);

    debug('POST %j %j (%j)', composedKey, value, options);
    self._packer.encode(value, function(err, body) {
      if (err) return callback(err);

      if (options.ttl) {
        self._set(composedKey, body, options.ttl, callback);
      } else {
        var NO_TTL = undefined;

        // ExtremeScale's REST API does not allow unsetting TTL value
        // The workaround is to delete the key first
        self._clear(composedKey, function(err) {
          debug(
            'Warning: cannot delete the key %s before setting a new value. %s',
            composedKey, err);
          self._set(composedKey, body, NO_TTL, callback);
        });
      }
    });
  });
};

ExtremeScaleKVConnector.prototype._set =
function(composedKey, body, ttl, callback) {
  var requestOptions = {
    uri: '/' + encodeURIComponent(composedKey),
    method: 'POST',
    qs: {ttl: ttl ? +ttl / 1000 : undefined},
    body: body,
    headers: {
      'content-type': 'application/octet-stream',
    },
  };

  this.request(requestOptions, function(err, res, body) {
    callback(err);
  });
};

ExtremeScaleKVConnector.prototype._clear = function(composedKey, callback) {
  var requestOptions = {
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
  var self = this;
  ModelKeyComposer.compose(modelName, key, function(err, composedKey) {
    if (err) return callback(err);

    self._get(composedKey, function(err, body) {
      if (err) return callback(err);
      if (body === null) {
        debug('GET %j -> (404 Not Found)', composedKey);
        return callback(null, null);
      }
      self._packer.decode(body, function(err, data) {
        if (err) return callback(err);
        debug('GET %j -> %j', composedKey, data);
        callback(null, data);
      });
    });
  });
};

ExtremeScaleKVConnector.prototype._get = function(composedKey, callback) {
  var requestOptions = {
    uri: '/' + encodeURIComponent(composedKey),
    method: 'GET',
    encoding: null, // get the body as a raw Buffer
  };

  this.request(requestOptions, function(err, res, body) {
    if (err && err.statusCode === 404 && /^CWOBJ9752E/.test(err.message)) {
      // key not found
      err = null;
      body = null;
    }

    return callback(err, body);
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
  var err = new Error(
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
  var err = new Error(
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
  var self = this;
  var KEY_QUERY = globToRegexp(filter.match || '*');

  var cache;

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
    var value = cache.shift();

    ModelKeyComposer.parse(value, function(err, parsed) {
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
    ModelKeyComposer.compose(modelName, KEY_QUERY, function(err, pattern) {
      if (err) return callback(err);
      self._query(pattern, function(err, body) {
        if (err) return callback(err);
        cache = body.items.map(function(it) { return it.key; });
        getNextKey(callback);
      });
    });
  }
};

ExtremeScaleKVConnector.prototype._query = function(query, callback) {
  var requestOptions = {
    baseUrl: this._queryUrl,
    uri: '/',
    method: 'GET',
    qs: {query: query},
    json: true,
  };

  this.request(requestOptions, function(err, res, body) {
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
  var looksLikeJsonString = typeof body === 'string' &&
    body[0] === '{' &&
    body[body.length - 1] === '}';
  if (looksLikeJsonString) {
    try {
      body = JSON.parse(body);
    } catch (err) {
      debug('Cannot parse JSON response %j', body);
    }
  }

  var msg = body && body.error || body ||
    res.statusCode + ' ' + res.statusMessage;
  var err = new Error(msg);
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
