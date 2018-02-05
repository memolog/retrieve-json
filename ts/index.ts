'use strict;';

const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');
const path = require('path');

module.exports = function retriveJSONData(inputFilePath, options) {
  return new Promise((fulfill, reject) => {
    const inputFileAbsolutePath = path.resolve(process.cwd(), inputFilePath);
    fs.readFile(
      inputFileAbsolutePath,
      {
        encoding: 'utf8'
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        const ast = esprima.parse(data);
        const result = estraverse.replace(ast, {
          enter: (node, parent) => {
            if (node.type === 'VariableDeclaration') {
              const declarations = node.declarations || [];
              const declaration = declarations && declarations[0];
              let kind = node.kind;
              if (!kind && declarations.length !== 1) {
                return node;
              }

              const declareType = declaration.type;
              const id = declaration.id;
              const idName = id && id.name;
              const init = declaration.init;
              const initCallee = init && init.callee;
              const initCalleeName = (initCallee && initCallee.name) || '';
              if (declareType === 'VariableDeclarator' && initCalleeName === 'require') {
                const initArg = (init.arguments || [])[0];
                const initArgValue = initArg && initArg.value;
                if (initArgValue && /\.json$/i.test(initArgValue)) {
                  const { dir } = path.parse(inputFilePath);
                  const prefix = options.prefix || '';
                  const paths = path.parse(initArgValue);
                  let jsonFilePath = paths.dir + '/' + prefix + paths.name + paths.ext;
                  let jsonPath = path.resolve(process.cwd(), dir, jsonFilePath);
                  const exists = fs.existsSync(jsonPath);
                  if (!fs.existsSync(jsonPath)) {
                    if (options.fallback) {
                      jsonFilePath = paths.dir + '/' + paths.name + paths.ext;
                      jsonPath = path.resolve(process.cwd(), dir, jsonFilePath);
                      if (!fs.existsSync(jsonPath)) {
                        return node;
                      }
                    } else {
                      return node;
                    }
                  }
                  const jsonString = fs.readFileSync(jsonPath, {
                    encoding: 'utf8'
                  });
                  return esprima.parse(`${kind} ${idName} = ${jsonString}`);
                }
              }
            }

            return node;
          }
        });

        const output = escodegen.generate(result) + '\n';

        let outFilePath;
        if (options.output) {
          outFilePath = path.resolve(process.cwd(), options.output);
        } else if (options.dist) {
          const { name, ext } = path.parse(inputFilePath);
          outFilePath = path.resolve(process.cwd(), options.dist, `./${name}${ext}`);
        } else if (options.override) {
          outFilePath = inputFileAbsolutePath;
        }

        if (!outFilePath) {
          fulfill(output);
          return;
        }

        fs.writeFile(outFilePath, output, { encoding: 'utf8' }, err => {
          if (err) {
            reject(err);
            return;
          }
          fulfill(output);
        });
      }
    );
  });
};
