'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var Class = require('corazon/class');
var property = require('corazon/property');

var track = require('../index');
var chalk = require('chalk');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var BaseQuery;

var format = function(spy) {
  return util.format.apply(util, spy.getCall(0).args);
};

var output = function(spy) {
  return chalk.stripColor(format(spy));
};

describe('tracker', function() {
  beforeEach(function() {
    BaseQuery = Class.extend({
      init: function(attributes) {
        _.extend(this, attributes);
      }
    })
    .extend(EventEmitter.prototype);
  });

  it('reports unexecuted queries', function(done) {
    var spy = sinon.spy();
    var query = BaseQuery.create({ sql: 'select 1', });

    track(query, { log: spy }); var line = __line;

    setImmediate(function() {
      expect(spy).to.have.been.calledOnce;
      expect(format(spy)).to.include(chalk.styles.red.open);
      expect(format(spy)).to.include(chalk.styles.cyan.open);
      expect(output(spy)).to.match(/Unexecuted Query: select 1/);
      expect(output(spy).split('\n')[1]).to.contain('tests.js:' + line);
      done();
    });
  });

  it('can report full stack traces for unexecuted queries', function(done) {
    var spy = sinon.spy();
    var query = BaseQuery.create({ sql: 'select 1', });

    track(query, { log: spy, fullTrace: true });

    setImmediate(function() {
      expect(spy).to.have.been.calledOnce;
      expect(format(spy)).to.include(chalk.styles.red.open);
      expect(format(spy)).to.include(chalk.styles.cyan.open);
      expect(output(spy)).to.match(/Unexecuted Query: select 1/);
      expect(output(spy).split('\n')[1]).to.contain('azul-tracker/index.js');
      done();
    });
  });


  it('does not report executed queries', function(done) {
    var spy = sinon.spy();
    var query = BaseQuery.create();

    track(query, { log: spy });

    query.emit('execute');

    setImmediate(function() {
      expect(spy).to.not.have.been.called;
      done();
    });
  });

  it('does not report pinned queries', function(done) {
    var spy = sinon.spy();
    var query = BaseQuery.create();

    track(query, { log: spy });

    query.pin();

    setImmediate(function() {
      expect(spy).to.not.have.been.called;
      done();
    });
  });

  it('tracks spawned queries', function(done) {
    var spy = sinon.spy();
    var original = BaseQuery.create({ sql: 'select 0' });
    var query = BaseQuery.create({ sql: 'select 1' });

    track(original, { log: spy });

    original.emit('spawn', query); var line = __line;

    setImmediate(function() {
      expect(spy).to.have.been.calledOnce;
      expect(format(spy)).to.include(chalk.styles.red.open);
      expect(format(spy)).to.include(chalk.styles.cyan.open);
      expect(output(spy)).to.match(/Unexecuted Query: select 1/);
      expect(output(spy).split('\n')[1]).to.contain('tests.js:' + line);
      done();
    });
  });

  it('tracks duped queries', function(done) {
    var spy = sinon.spy();
    var original = BaseQuery.create({ sql: 'select 0' });
    var query = BaseQuery.create({ sql: 'select 1' });

    track(original, { log: spy });

    original.emit('dup', query); var line = __line;

    setImmediate(function() {
      expect(spy).to.have.been.calledOnce;
      expect(format(spy)).to.include(chalk.styles.red.open);
      expect(format(spy)).to.include(chalk.styles.cyan.open);
      expect(output(spy)).to.match(/Unexecuted Query: select 1/);
      expect(output(spy).split('\n')[1]).to.contain('tests.js:' + line);
      done();
    });
  });

  it('tracks queries with sql that cannot be generated', function(done) {
    var spy = sinon.spy();
    var query = BaseQuery.create();

    BaseQuery.reopen({
      sql: property(function() {
        throw new Error('SQL cannot be generated');
      })
    });

    track(query, { log: spy });

    setImmediate(function() {
      expect(spy).to.have.been.calledOnce;
      expect(format(spy)).to.include(chalk.styles.red.open);
      expect(format(spy)).to.include(chalk.styles.cyan.open);
      expect(output(spy)).to.match(/Unexecuted Invalid Query: SQL cannot be generated/);
      done();
    });
  });

  var env = function(value) {
    beforeEach(function() {
      this.env = process.env.NODE_ENV;
      process.env.NODE_ENV = value;
    });
    afterEach(function() {
      if (this.env) { process.env.NODE_ENV = this.env; }
      else { delete process.env.NODE_ENV; }
    });
  };

  describe('in development', function() {
    env('development');

    it('automatically starts', function() {
      var spy = sinon.spy();
      var query = BaseQuery.create();

      BaseQuery.reopen({ track: spy });

      track(query);
      expect(spy).to.have.been.calledOnce;
    });
  });


  describe('in test', function() {
    env('test');

    it('automatically starts', function() {
      var spy = sinon.spy();
      var query = BaseQuery.create();

      BaseQuery.reopen({ track: spy });

      track(query);
      expect(spy).to.have.been.calledOnce;
    });
  });

  describe('in production', function() {
    env('production');

    it('does not automatically start', function() {
      var spy = sinon.spy();
      var query = BaseQuery.create();

      BaseQuery.reopen({ track: spy });

      track(query);
      expect(spy).to.not.have.been.called;
    });
  });
});

// get line number at the current location
if (!global.__line) {
  var getLine = function() {
    var v8Handler = Error.prepareStackTrace;
    Error.prepareStackTrace = function(dummy, stack) { return stack; };
    var error = new Error;
    Error.captureStackTrace(error, getLine);
    var stack = error.stack;
    Error.prepareStackTrace = v8Handler;
    return stack[0].getLineNumber();
  };
  Object.defineProperty(global, '__line', {
    get: getLine
  });
}
