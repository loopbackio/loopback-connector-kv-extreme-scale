// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-kv-extreme-scale
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var createDataSource = require('../helpers/data-source-factory');

describeIf(!process.env.CI, 'Juggler API', function() {
  this.timeout(20000);
  require('loopback-datasource-juggler/test/kvao.suite.js')(createDataSource, {
    canExpire: false,
    canQueryTtl: false,
    ttlPrecision: 1000,
    canIterateLargeKeySets: false,
  });
});

function describeIf(cond, desc, fn) {
  if (cond)
    describe(desc, fn);
  else
    describe.skip(desc, fn);
}
