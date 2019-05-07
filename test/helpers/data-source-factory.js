// Copyright IBM Corp. 2016,2017. All Rights Reserved.
// Node module: loopback-connector-kv-extreme-scale
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const assert = require('assert');
const connector = require('../..');
const DataSource = require('loopback-datasource-juggler').DataSource;
const extend = require('util')._extend;

// Allow urls with hardcoded mapname or dynamic mapname based on model names
// (ie. no trailing `/default` in the url).
let url = process.env.EXTREME_SCALE_URL;
if (url && /\/wxsdata\/v1\/grids\/[^\/]+\/default$/.test(url))
  url = url.replace(/\/default$/, '') || '';

const SETTINGS = {
  url: url, // TODO add Docker-based default
  strictSSL: false,
  connector: connector,
};

if (SETTINGS.url) {
  console.log('Using EXTREME_SCALE_URL %j', SETTINGS.url);
}

function createDataSource(options) {
  assert(!!SETTINGS.url,
   'Connector tests require EXTREME_SCALE_URL env variable pointing to ' +
     ' a running ExtremeScale server. For example:\n' +
     'EXTREME_SCALE_URL=https://user:pass@host.example.com:9444' +
     '/wxsdata/v1/grids/testgrid1');

  let settings = extend({}, SETTINGS);
  settings = extend(settings, options);
  return new DataSource(settings);
};

module.exports = createDataSource;

createDataSource.failing = function(options) {
  const settings = extend({
    url: 'http://127.0.0.1:10/not-found',
  }, options);

  return createDataSource(settings);
};

createDataSource.binary = function(options) {
  const settings = extend({
    packer: 'binary',
  }, options);

  return createDataSource(settings);
};
