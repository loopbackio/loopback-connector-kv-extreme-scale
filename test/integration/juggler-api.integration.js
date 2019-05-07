// Copyright IBM Corp. 2016,2017. All Rights Reserved.
// Node module: loopback-connector-kv-extreme-scale
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const createDataSource = require('../helpers/data-source-factory');
const kvaoTestSuite = require('loopback-datasource-juggler/test/kvao.suite.js');

const connectorCapabilities = {
  canExpire: false,
  canQueryTtl: false,
  ttlPrecision: 1000,
  canIterateLargeKeySets: false,
};

describe('Juggler API', function() {
  this.timeout(20000);

  context('using default json-string packer', function() {
    kvaoTestSuite(createDataSource, connectorCapabilities);
  });

  context('using binary packer', function() {
    kvaoTestSuite(createDataSource.binary, connectorCapabilities);
  });
});
