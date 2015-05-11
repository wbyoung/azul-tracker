# Azul.js Tracker

[![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Code Climate][codeclimate-image]][codeclimate-url] [![Coverage Status][coverage-image]][coverage-url] [![Dependencies][david-image]][david-url] [![devDependencies][david-dev-image]][david-dev-url]

A query tracking utility for [Azul.js][azul] that reports un-executed queries to
help catch mistakes during development.

## Overhead

There is significant overhead when using this tool, and it is
_strongly advised_ to _never_ enable it in production. You may want to disable
it when testing as well if you have a large test suite.

## Examples

```js
require('azul-tracker')(db.query);

// executed query will not generate a warning
Article.objects.insert().execute();

// pinned query will not generate a warning
var publishedArticles = Article.objects.where({ published: true }).pin();

// un-pinned query will generate a warning
var publishedArticles = Article.objects.where({ published: true });
```

Multiple methods in Azul.js [execute a query][azul-execute]. These include:

- `execute`
- `fetch`
- `fetchOne`
- `find`
- `findOrCreate`
- `then`

Sometimes you'll still want to create queries that are not executed immediately
(before the next event loop iteration). This may be useful when promises are
built across multiple asynchronous events:

```js
var articles = Article.objects.all().pin();
var promise = Promise.resolve(); // empty promise to start things off

if (req.session.userId) {
  // if the user is logged in, look up the user from the database
  promise = promise.then(function() {
    return User.objects.find(req.session.userId);
  })
  .then(function(user) {
    // if the user isn't an administrator, show them just their articles
    if (!user.isAdmin) {
      articles = articles.where({ author: user }).pin();
    }
  });
}
else {
  // when the user is not logged in, just show public articles
  articles = articles.where({ public: true }).pin();
}

// resolve any promises made up until this point & continue
promise.then(function() {
  return articles.fetch();
})
.then(function(articles) {
  res.send({ articles: articles });
})
```

## API

### azulTracker(query, [options])

#### query

Type: `Query`

An Azul.js query object. The query and all queries that are derived from it
will be tracked to ensure they are executed. Usually you'll want this to be
your main query instance, `db.query`. Additionally, this will add new `track`
and `pin` methods to all queries.

#### options.start

Type: `Boolean`  
Default: `true` in development & test environments

Whether the tracking is automatically started or not. If you use pinned queries
in development, you can simply not start the tracker in production. The `pin`
method has very low overhead, and tracking (which has high overhead) will never
begin.

The environment is determined from `process.env.NODE_ENV` and assumed to be
development if this environment variable is not set.

#### options.log

Type: `Function`  
Default: `console.log`

The function that will be called with logging output. This should function the
same way that `console.log` does.

### Query.track([options])

Enable tracking for a specific query object & all derived queries. This may be
useful to only track queries in a specific section of your code base.

Usually you will not need to call this directly since tracking will
automatically begin when calling `azulTracker`.

#### options.log

Same as `azulTracker.options.log`.

### Query.pin()

Mark a query as pinned, that is it's known to be un-executed at this time.
You'll likely do this for base queries that you will build other queries from
at a later time.

This does not disable tracking for derived queries, just for this one query.


## License

This project is distributed under the MIT license.

[azul]: http://www.azuljs.com/
[azul-execute]: http://www.azuljs.com/guides/queries/#executing

[travis-image]: http://img.shields.io/travis/wbyoung/azul-tracker.svg?style=flat
[travis-url]: http://travis-ci.org/wbyoung/azul-tracker
[npm-image]: http://img.shields.io/npm/v/azul-tracker.svg?style=flat
[npm-url]: https://npmjs.org/package/azul-tracker
[codeclimate-image]: http://img.shields.io/codeclimate/github/wbyoung/azul-tracker.svg?style=flat
[codeclimate-url]: https://codeclimate.com/github/wbyoung/azul-tracker
[coverage-image]: http://img.shields.io/coveralls/wbyoung/azul-tracker.svg?style=flat
[coverage-url]: https://coveralls.io/r/wbyoung/azul-tracker
[david-image]: http://img.shields.io/david/wbyoung/azul-tracker.svg?style=flat
[david-url]: https://david-dm.org/wbyoung/azul-tracker
[david-dev-image]: http://img.shields.io/david/dev/wbyoung/azul-tracker.svg?style=flat
[david-dev-url]: https://david-dm.org/wbyoung/azul-tracker#info=devDependencies
