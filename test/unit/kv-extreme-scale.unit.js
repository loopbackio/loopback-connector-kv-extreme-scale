'use strict';
const Connector = require('../../lib/kv-extreme-scale')._Connector;
const dsFactory = require('../helpers/data-source-factory');
const expect = require('../helpers/expect');

describe('eXtreme Scale Connector', () => {
  describe('mapname', () => {
    const modelName = 'TestModel';
    // connector defaults key expiration to LastUpdateTime with Optimistic
    // locking
    const keyExpirationDefaults = '.LUT.O';
    let ds;
    before(createDataSource);

    context('without user-defined mapname', () => {
      const expectedMapname = modelName + keyExpirationDefaults;
      before(createModelWithoutUserDefinedMapname);

      it('returns the model name', () => {
        const mapname = ds.connector.mapname(modelName);
        expect(mapname).to.equal(expectedMapname);
      });

      it('returns the model name -- connector alias `mapName`', () => {
        const mapname = ds.connector.mapName(modelName);
        expect(mapname).to.equal(expectedMapname);
      });

      function createModelWithoutUserDefinedMapname() {
        ds.define(modelName);
      }
    });

    context('with user-defined mapname', () => {
      const expectedMapname = 'JavaMap' + keyExpirationDefaults;
      before(createModelWithUserDefinedMapname);

      it('returns the user-defined mapname', () => {
        const mapname = ds.connector.mapname(modelName);
        expect(mapname).to.equal(expectedMapname);
      });

      it('returns the user-defined mapname -- connector alias `mapName`',
      function() {
        const mapname = ds.connector.mapName(modelName);
        expect(mapname).to.equal(expectedMapname);
      });

      it('returns the user-defined mapname -- model definition alias `mapName`',
      function() {
        ds.define(modelName, {}, {
          'kv-extreme-scale': {
            mapName: 'JavaMap',
          },
        });
        const mapname = ds.connector.mapName(modelName);
        expect(mapname).to.equal(expectedMapname);
      });

      function createModelWithUserDefinedMapname() {
        ds.define(modelName, {}, {
          'kv-extreme-scale': {
            mapname: 'JavaMap',
          },
        });
      }
    });

    function createDataSource() {
      ds = dsFactory({url: 'not-required'});
    }
  });
});
