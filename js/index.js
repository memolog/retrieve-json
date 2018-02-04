'use strict;';
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var fs = require('fs');
var path = require('path');
module.exports = function retriveJSONData(inputFilePath, options) {
    return new Promise(function (fulfill, reject) {
        var inputFileAbsolutePath = path.resolve(process.cwd(), inputFilePath);
        fs.readFile(inputFileAbsolutePath, {
            encoding: 'utf8'
        }, function (err, data) {
            if (err) {
                reject(err);
                return;
            }
            var ast = esprima.parse(data);
            var result = estraverse.replace(ast, {
                enter: function (node, parent) {
                    if (node.type === 'VariableDeclaration') {
                        var declarations = node.declarations || [];
                        var declaration = declarations && declarations[0];
                        var kind = node.kind;
                        if (!kind && declarations.length !== 1) {
                            return node;
                        }
                        var declareType = declaration.type;
                        var id = declaration.id;
                        var idName = id && id.name;
                        var init = declaration.init;
                        var initCallee = init && init.callee;
                        var initCalleeName = (initCallee && initCallee.name) || '';
                        if (declareType === 'VariableDeclarator' && initCalleeName === 'require') {
                            var initArg = (init.arguments || [])[0];
                            var initArgValue = initArg && initArg.value;
                            if (initArgValue && /\.json$/i.test(initArgValue)) {
                                var dir = path.parse(inputFilePath).dir;
                                var prefix = options.prefix || '';
                                var paths = path.parse(initArgValue);
                                var jsonFilePath = paths.dir + '/' + prefix + paths.name + paths.ext;
                                var jsonPath = path.resolve(process.cwd(), dir, jsonFilePath);
                                var exists = fs.existsSync(jsonPath);
                                if (!exists) {
                                    return node;
                                }
                                var jsonString = fs.readFileSync(jsonPath, {
                                    encoding: 'utf8'
                                });
                                return esprima.parse(kind + " " + idName + " = " + jsonString);
                            }
                        }
                    }
                    return node;
                }
            });
            var output = escodegen.generate(result) + '\n';
            var outFilePath;
            if (options.output) {
                outFilePath = path.resolve(process.cwd(), options.output);
            }
            else if (options.dist) {
                var _a = path.parse(inputFilePath), name_1 = _a.name, ext = _a.ext;
                outFilePath = path.resolve(process.cwd(), options.dist, "./" + name_1 + ext);
            }
            else if (options.override) {
                outFilePath = inputFileAbsolutePath;
            }
            if (!outFilePath) {
                fulfill(output);
                return;
            }
            fs.writeFile(outFilePath, output, { encoding: 'utf8' }, function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                fulfill(output);
            });
        });
    });
};
