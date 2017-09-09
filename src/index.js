import * as t from "babel-types";
import generate from "babel-generator";
import template from "babel-template";

const restify = 'RESTIFY';
const sections = [ 'PRE', 'USE', 'ROUTES', 'ERRORS' ];
const assignments = [ 'ROUTED', 'AFTER', 'CLOSE' ];

function initState() { 
	return {
		insideRestify: false,
		serverVarIdent: undefined,
		currentSection: undefined,
		currentRoute: undefined,
		sections: { 
			options: [],
			pre: [],
			use: [],
			routes: {},
			errors: [],
			routed: undefined,
			after: undefined,
			close: undefined
		},
		createServerTemplate: template(`var VARNAME = restify.createServer(OPTIONS);`),
		serverPreTemplate: template(`VARNAME.pre(MIDDLEWARE);`),
		serverUseTemplate: template(`VARNAME.use(MIDDLEWARE);`),
		serverOnTemplate: template(`VARNAME.on(EVENT, MIDDLEWARE);`),
		serverMethodTemplate: template(`VARNAME.METHOD(OPTIONS, HANDLER);`)
	}
}

function stateToCode(state, path) {
	var code = [
		state.data.createServerTemplate( { 
			VARNAME: state.data.serverVarIdent,
			OPTIONS: t.objectExpression(state.data.sections.options) } )
	];

	for (let i = 0, len = state.data.sections.pre.length; i < len; i++) {
		code.push(state.data.serverPreTemplate({ 
			VARNAME: state.data.serverVarIdent, 
			MIDDLEWARE: state.data.sections.pre[i] }));
	}

	for (let i = 0, len = state.data.sections.use.length; i < len; i++) {
		code.push(state.data.serverUseTemplate({ 
			VARNAME: state.data.serverVarIdent, 
			MIDDLEWARE: state.data.sections.use[i] }));
	}

	for (let i = 0, len = state.data.sections.errors.length; i < len; i++) {
		code.push(state.data.serverOnTemplate({ 
			VARNAME: state.data.serverVarIdent, 
			EVENT: t.stringLiteral(state.data.sections.errors[i].left.name), 
			MIDDLEWARE: state.data.sections.errors[i].right }));
	}

	for (let key in state.data.sections.routes) {
		var curRouteData = state.data.sections.routes[key];
		var curPath = curRouteData.path;
		var curName = undefined;
		var curVersion = undefined;
		var assign = curRouteData.assign;
		var methods = [ 'del', 'get', 'head', 'opts', 'post', 'put', 'patch' ];

		for (let i = 0, len = assign.length; i < len; i++) {
			var node = assign[i];
			if (node.left.type != 'Identifier') 
				throw "route entry assignment must have identifier on left hand side";

			var left = node.left.name;

			if (left == 'name') {
				curName = node.right;
			} else if (left == 'version') {
				curVersion = node.right;
			} else if (methods.includes(left)) {
				var options = t.objectExpression([ t.objectProperty(t.identifier("path"), curPath) ]);
				if (curName)
					options.properties.push(t.objectProperty(t.identifier("name"), curName));
				if (curVersion)
					options.properties.push(t.objectProperty(t.identifier("version"), curVersion));

				code.push(state.data.serverMethodTemplate({
					VARNAME: state.data.serverVarIdent,
					METHOD: node.left,
					OPTIONS: options,
					HANDLER: node.right
				}));
			} else {
				throw "invalid route entry assignment";
			}
		}
	}

	if (state.data.sections.routed) {
		code.push(state.data.serverOnTemplate({
			VARNAME: state.data.serverVarIdent,
			EVENT: t.stringLiteral("routed"),
			MIDDLEWARE: state.data.sections.routed
		}));
	}

	if (state.data.sections.after) {
		code.push(state.data.serverOnTemplate({
			VARNAME: state.data.serverVarIdent,
			EVENT: t.stringLiteral("after"),
			MIDDLEWARE: state.data.sections.after
		}));
	}

	if (state.data.sections.close) {
		code.push(state.data.serverOnTemplate({
			VARNAME: state.data.serverVarIdent,
			EVENT: t.stringLiteral("close"),
			MIDDLEWARE: state.data.sections.close
		}));
	}

	path.insertAfter(code);
	state.data = undefined;
}

function parseSequence(state, path, func, allowedTypes = undefined) {
	for (let i = 0, len = path.node.expression.expressions.length; i < len; i++) {
		var expr = path.node.expression.expressions[i];
		if (allowedTypes && !allowedTypes.includes(expr.type))
			throw path.buildCodeFrameError("parseSequence: invalid expression");
		func(state, path.node.expression.expressions[i]);
	}
}

function parseExpr(state, path, func, allowedTypes = undefined) {
	if (path.node.expression.type == 'SequenceExpression') {
		parseSequence(state, path, func, allowedTypes);
	} else {
		if (allowedTypes && !allowedTypes.includes(path.node.expression.type))
			throw path.buildCodeFrameError("parseExpr: invalid expression");
		func(state, path.node.expression);
	}
}

export default function({types: t }) {
	return {
		visitor: {
			ExpressionStatement(path, state) {
				if (!state.data) state.data = initState();

				if (!state.data.insideRestify) {
					if (path.node.expression.type != "CallExpression") return;
					if (path.node.expression.callee.type != 'Identifier') return;
					if (path.node.expression.callee.name != restify) return;

					state.data.insideRestify = true;
					state.data.serverVarIdent = path.node.expression.arguments[0];
					state.data.currentSection = 'OPTIONS';
				} else if (path.node.expression.type == 'Identifier' && path.node.expression.name == 'END') {
					stateToCode(state, path);
				} else if (path.node.expression.type == 'Identifier' && sections.includes(path.node.expression.name)) {
					state.data.currentSection = path.node.expression.name;
				} else if (path.node.expression.type == 'AssignmentExpression' && path.node.expression.left.type == "Identifier" && assignments.includes(path.node.expression.left.name)) {
					if (path.node.expression.left.name == 'ROUTED')
						state.data.sections.routed = path.node.expression.right;
					else if (path.node.expression.left.name == 'AFTER')
						state.data.sections.after = path.node.expression.right;
					else if (path.node.expression.left.name == 'CLOSE')
						state.data.sections.close = path.node.expression.right;
				} else if (state.data.currentSection == "OPTIONS") {
					parseExpr(state, path, (state, expr) => state.data.sections.options.push(t.objectProperty(expr.left, expr.right)), [ 'AssignmentExpression' ]);
				} else if (state.data.currentSection == "PRE") {
					parseExpr(state, path, (state, expr) => state.data.sections.pre.push(expr) );
				} else if (state.data.currentSection == "USE") {
					parseExpr(state, path, (state, expr) => state.data.sections.use.push(expr) );
				} else if (state.data.currentSection == "ERRORS") {
					parseExpr(state, path, (state, expr) => state.data.sections.errors.push(expr) );
				} else if (state.data.currentSection == 'ROUTES') {
					parseExpr(state, path, 
						(state, expr) => {
							if (expr.type == 'StringLiteral') {
								state.data.currentRoute = expr.value;
								state.data.sections.routes[state.data.currentRoute] = {
									path: expr,
									assign: []
								};
							} else if (expr.type == 'UnaryExpression' && expr.operator == '~') {
								state.data.currentRoute = generate(expr.argument).code;
								state.data.sections.routes[state.data.currentRoute] = {
									path: expr.argument,
									assign: []
								};
							} else if (expr.type == 'AssignmentExpression') {
								state.data.sections.routes[state.data.currentRoute].assign.push(expr);
							}
							
						}, [ 'StringLiteral', 'UnaryExpression', 'AssignmentExpression' ]);
				} else
					throw path.buildCodeFrameError("invalid expression");

				path.remove();
			}
		}
	};
}
