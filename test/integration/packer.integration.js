'use strict';

const createDataSource = require('../helpers/data-source-factory');
const expect = require('../helpers/expect');
const extend = require('util')._extend;

const aValue = {foo: 'bar'};

describe('packer option', () => {
  describe('json', () => {
    let ds;
    beforeEach('create json datasource', () => {
      ds = createDataSource();
    });

    it('is used as the default storage format', (done) => {
      const complexObjectValue = {
        name: 'a-string',
        age: 42,
        flag: true,
        date: new Date(),
      };

      ds.connector.set('TestModel', 'a-key', complexObjectValue, {}, (err) => {
        if (err) return done(err);
        ds.connector._get('TestModel:a-key', (err, result) => {
          if (err) return done(err);
          const stored = JSON.parse(result.toString());
          const expected = JSON.parse(JSON.stringify(complexObjectValue));
          expect(stored).to.eql(expected);
          done();
        });
      });
    });

    it('sets correct Content-Type header', (done) => {
      ds.connector.set('TestModel', 'another-key', aValue, {}, (err) => {
        if (err) return done(err);
        ds.connector._get('TestModel:another-key', (err, body, headers) => {
          if (err) return done(err);
          // allow additional parameters like "appliction/json; charset=UTF-8"
          expect(headers['content-type']).to.match(/^application\/json\b/);
          done();
        });
      });
    });
  });

  describe('binary', () => {
    let ds;
    beforeEach('create binary datasource', () => {
      ds = createDataSource.binary();
    });

    it('uses selected packer', (done) => {
      ds.connector.set('TestModel', 'a-key', aValue, {}, (err) => {
        if (err) return done(err);
        ds.connector._get('TestModel:a-key', (err, result) => {
          if (err) return done(err);
          expect(result.toString('hex'))
            .to.equal('81a3666f6fa3626172');
          done();
        });
      });
    });

    it('sets correct Content-Type header', () => {
      ds.connector.set('TestModel', 'another-key', aValue, {}, (err) => {
        if (err) return done(err);
        ds.connector._get('TestModel:another-key', (err, body, headers) => {
          if (err) return done(err);
          expect(headers['content-type']).to.equal('application/octet-stream');
          done();
        });
      });
    });
  });
});
