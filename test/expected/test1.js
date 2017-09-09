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
serverA.use(acceptParser(server.acceptable));
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
