// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-kv-extreme-scale
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const assert = require('assert');
const connector = require('../..');
const DataSource = require('loopback-datasource-juggler').DataSource;
const extend = require('util')._extend;

const SETTINGS = {
  url: process.env.EXTREME_SCALE_URL, // TODO add Docker-based default
  strictSSL: false,
  connector: connector,
};

function createDataSource(options) {
  assert(!!SETTINGS.url,
   'Connector tests require EXTREME_SCALE_URL env variable pointing to ' +
     ' a running ExtremeScale server. For example:\n' +
     'EXTREME_SCALE_URL=https://user:pass@host.example.com:9444' +
     '/wxsdata/v1/grids/testgrid1/testgrid1');

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

beforeEach(function clearDatabase(done) {
  this.timeout(10000);
  const ds = createDataSource();
  const requestOptions = {
    method: 'DELETE',
    uri: '',
  };
  ds.connector.request(requestOptions, done);
});
