# restify-markup

This is a Babel plugin that provides an alternative syntax for defining [Restify](http://restify.com) servers.

## Installation

```sh
$ npm install restify-markup
```

## Usage


### Via `.babelrc`

**.babelrc**

```json
{
  "plugins": ["restify-markup"]
}
```

### Via CLI

```sh
$ babel --plugins restify-markup script.js
```

### Via Node API

```js
require("babel-core").transform("code", {
  plugins: ["restify-markup"]
});
```

## Example

```js
RESTIFY(serverA)
		name="ServerName", version='2.0.1', log=bunyan_logger
		certificate="abc", key="abc"
		formatters={
			"application/foo": formatFoo,
			"text/css; q=0.9": formatCss
		}
		handleUncaughtExceptions=true 
		handleUpgrades=false 
		strictRouting=false
		spdy={}
		httpsServerOptions={}

		PRE
			restify.plugins.pre.userAgentConnection()
			restify.pre.dedupeSlashes()

		USE
			acceptParser(serverA.acceptable)
			authorizationParser
			dateParser, queryParser, jsonp
			gzipResponse, bodyParser, requestExpiry
			throttle(throttleConfig)
			conditionalRequest, blacklist, acl
            
		ROUTES
			'/hello/:name'
				get=getHello, head=headHello

			'/cities/:slug'
				name='city'
				version='1.0.0'
					get=sendV1
				version=['2.0.0', '2.0.1']
					get=sendV2

			~'/foo'
				post=[fooPostPart1, fooPostPart2]

			~/regex/
				post=handleRegexPost

		ERRORS
			InternalServer=handleInternalServerError
			restifyError=handleRestifyError
			NotFound=handleNotFoundError
			MethodNotAllowed=handleMethodNotAllowed
			VersionNotAllowed=handleBadVersion
			UnsupportedMediaType=handleUnsupportedMediaType
			uncaughtException=handleUncaughtException

		ROUTED=handleRouted
		AFTER=handleAfter
		CLOSE=handleClose
END
```

### Transpiles to:
```js
var serverA = restify.createServer({
	name: "ServerName",
	version: '2.0.1',
	log: bunyan_logger,
	certificate: "abc",
	key: "abc",
	formatters: {
		"application/foo": formatFoo,
		"text/css; q=0.9": formatCss
	},
	handleUncaughtExceptions: true,
	handleUpgrades: false,
	strictRouting: false,
	spdy: {},
	httpsServerOptions: {}
});
serverA.pre(restify.plugins.pre.userAgentConnection());
serverA.pre(restify.pre.dedupeSlashes());
serverA.use(acceptParser(serverA.acceptable));
serverA.use(authorizationParser);
serverA.use(dateParser);
serverA.use(queryParser);
serverA.use(jsonp);
serverA.use(gzipResponse);
serverA.use(bodyParser);
serverA.use(requestExpiry);
serverA.use(throttle(throttleConfig));
serverA.use(conditionalRequest);
serverA.use(blacklist);
serverA.use(acl);
serverA.on("InternalServer", handleInternalServerError);
serverA.on("restifyError", handleRestifyError);
serverA.on("NotFound", handleNotFoundError);
serverA.on("MethodNotAllowed", handleMethodNotAllowed);
serverA.on("VersionNotAllowed", handleBadVersion);
serverA.on("UnsupportedMediaType", handleUnsupportedMediaType);
serverA.on("uncaughtException", handleUncaughtException);
serverA.get({
	path: '/hello/:name'
}, getHello);
serverA.head({
	path: '/hello/:name'
}, headHello);
serverA.get({
	path: '/cities/:slug',
	name: 'city',
	version: '1.0.0'
}, sendV1);
serverA.get({
	path: '/cities/:slug',
	name: 'city',
	version: ['2.0.0', '2.0.1']
}, sendV2);
serverA.post({
	path: '/foo'
}, [fooPostPart1, fooPostPart2]);
serverA.post({
	path: /regex/
}, handleRegexPost);
serverA.on("routed", handleRouted);
serverA.on("after", handleAfter);
serverA.on("close", handleClose);
```

## Syntax

##### RESTIFY(*varName*) ... END
Specifies the variable name and the block containing the server configuration.

##### PRE

Specifies *pre* handlers.

##### USE

Specifies *use* handlers.

##### ROUTES

Specifies *route* handlers.  If the route path is not a string literal, it must be prefixed with a tilde (*~*) character.

##### ERRORS

Specifies *error* handlers.

##### ROUTED=*handler*, AFTER=*handler*, CLOSE=*handler*

Specifies *routed*, *after*, and *close* handlers.

