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
			acceptParser(server.acceptable)
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
