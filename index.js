'use strict';

var _ = require('lodash');
var chalk = require('chalk');

/**
 * Setup the BaseQuery class.
 *
 * @param {Class} BaseQuery
 * @param {Object} globalOptions
 */
var setup = function(BaseQuery, globalOptions) {
  BaseQuery.reopen({
    track: function(options) {
      var stack = new Error().stack.split('\n').slice(1);
      var opts = _.defaults({}, globalOptions, options, {
        fullTrace: false,
        log: console.log,
      });
      var log = opts.log;

      this.on('dup', this.pin);
      this.on('spawn', this.pin);
      this.on('execute', this.pin);
      this.on('dup', function(q) { q.track(options); });
      this.on('spawn', function(q) { q.track(options); });

      clearImmediate(this._tracker);

      this._tracker = setImmediate(function() {
        var message = chalk.red('Unexecuted Query: ');
        var sql;
        try { sql = this.sql; }
        catch (e) {
          message = chalk.red('Unexecuted Invalid Query: ');
          sql = chalk.yellow(e.message);
        }
        var filter = function(line) {
          return !opts.fullTrace &&
            line.match(/azul-tracker\/index|azul\/lib|\(events.js:\d+:\d+\)/);
        };
        var filteredStack = _.dropWhile(stack, filter).join('\n');

        log(message + chalk.cyan('%s\n') + chalk.gray('%s'),
          sql, filteredStack);
      }.bind(this));

      return this;
    },

    pin: function() {
      clearImmediate(this._tracker);
      return this;
    }
  });
};

/**
 * Get the BaseQuery class from a query instance.
 *
 * @param {BaseQuery} query
 * @return {Class}
 */
var baseQueryClass = function(query) {
  var classes = [];
  var cls = query.__identity__;
  while (cls) {
    classes.push(cls);
    cls = cls.__super__;
  }
  return classes.splice(-2)[0];
};

/**
 * Enabling tracking for an Azul.js query & all derived queries.
 *
 * @param {Query} query
 * @param {Object} options
 * @param {Boolean} options.start
 * @param {Boolean} options.fullTrace Enable full backtraces which will allow
 * tracking down potentially unexecuted queries from within Azul.js.
 * @param {Function} options.log A logging function which defaults to
 * console.log.
 */
module.exports = function(query, options) {
  var env = process.env.NODE_ENV || 'development';
  var opts = _.defaults({}, options, {
    start: (env === 'development' || env === 'test')
  });
  if (!query.track) {
    setup(baseQueryClass(query), options);
  }
  if (opts.start) {
    query.track(options);
  }
};
