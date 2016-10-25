'use strict';

var assert = require('assert');
var connector = require('../..');
var DataSource = require('loopback-datasource-juggler').DataSource;
var extend = require('util')._extend;

var SETTINGS = {
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

  var settings = extend({}, SETTINGS);
  settings = extend(settings, options);
  return new DataSource(settings);
};

module.exports = createDataSource;

createDataSource.failing = function(options) {
  var settings = extend({
    url: 'http://127.0.0.1:10/not-found',
  }, options);

  return createDataSource(settings);
};

beforeEach(function clearDatabase(done) {
  this.timeout(10000);
  var ds = createDataSource();
  var requestOptions = {
    method: 'DELETE',
    uri: '',
  };
  ds.connector.request(requestOptions, done);
});
