var fs = require('fs');

var es6arrowfn = require('es6-arrow-function');
var es6class = require('es6-class');
var regenerator = require('regenerator');

var esprima = require('esprima');
var recast = require('recast');

/**
 * Compile the given next-generation JavaScript into JavaScript usable in
 * today's runtime environments. Pass options to control which features to
 * include.
 *
 * Options
 *
 *   arrowFunction - Compile ES6 arrow functions into normal functions. Default: on.
 *   class - Compile ES6 classes into ES5 constructors. Default: on.
 *   generator - Compile generator functions into ES5. Default: on.
 *   includeRuntime - Include any runtime needed for compilers that require a
 *                    runtime. Default: variable.
 *
 * @param {string} source
 * @param {object} options
 * @return {{code:string, map:string}}
 */
function compile(source, options) {
  if (!options) { options = {}; }
  var ast = recast.parse(source, {
    esprima: esprima,
    sourceFileName: options.sourceFileName
  });
  ast = transform(ast, options);
  return recast.print(ast, {
    sourceMapName: options.sourceMapName
  });
}

/**
 * Transform the given next-generation JavaScript AST into a JavaScript AST
 * usable in today's runtime environments. Pass options to control which
 * features to include.
 *
 * Options
 *
 *   arrowFunction - Compile ES6 arrow functions into normal functions. Default: on.
 *   class - Compile ES6 classes into ES5 constructors. Default: on.
 *   generator - Compile generator functions into ES5. Default: on.
 *
 * @param {object} ast
 * @param {object} options
 * @return {object}
 */
function transform(ast, options) {
  if (!options) { options = {}; }

  if (options.arrowFunction !== false) {
    ast = es6arrowfn.transform(ast);
  }

  if (options['class'] !== false) {
    ast = es6class.transform(ast);
  }

  if (options.generator !== false) {
    ast = regenerator.transform(ast);
  }

  if (options.includeRuntime) {
    var runtime = fs.readFileSync(regenerator.runtime.dev, 'utf8');
    injectRuntime(runtime, regenerator.runtime.dev, ast.program);
  }

  return ast;
}

/**
 * Originally from http://facebook.github.io/regenerator/.
 *
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */
function injectRuntime(runtime, filename, ast) {
  recast.types.builtInTypes.string.assert(runtime);
  recast.types.namedTypes.Program.assert(ast);

  // Include the runtime by modifying the AST rather than by concatenating
  // strings. This technique will allow for more accurate source mapping.
  if (runtime !== "") {
    var runtimeBody = recast.parse(runtime, {
      sourceFileName: filename
    }).program.body;

    var body = ast.body;
    body.unshift.apply(body, runtimeBody);
  }

  return ast;
}
/**
 * End Facebook Copyright.
 */

exports.compile = compile;
