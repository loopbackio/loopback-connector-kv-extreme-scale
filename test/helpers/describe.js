// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-kv-extreme-scale
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

module.exports = (desc, fn) => {
  if (process.env.CI)
    describe.skip(desc, fn);
  else
    describe(desc, fn);
};
