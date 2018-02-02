'use strict;';

const esprima = require('esprima');
const escodegen = require('escodegen');
const fs = require('fs');
const path = require('path');

function parseBody(body, inputFilePath, options) {
  body.forEach((obj, index) => {
    const type = obj.type || '';
    const consequent = obj.consequent;
    if (consequent) {
      const consequentBody = consequent.body;
      consequent.body = parseBody(consequentBody, inputFilePath, options);
      return;
    }
    if (type === 'VariableDeclaration') {
      const declarations = obj.declarations;
      let kind = obj.kind;
      if (!kind) {
        return body;
      }

      declarations.forEach(declaration => {
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
            const jsonFilePath = paths.dir + '/' + prefix + paths.name + paths.ext;
            const jsonPath = path.resolve(process.cwd(), dir, jsonFilePath);
            const exists = fs.existsSync(jsonPath);
            if (!exists) {
              return;
            }
            const jsonString = fs.readFileSync(jsonPath, {
              encoding: 'utf8'
            });
            body[index] = esprima.parse(`${kind} ${idName} = ${jsonString}`);
          }
        }
      });
    }
  });

  return body;
}

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
        const AST = esprima.parse(data);
        const body = AST && AST.body;

        parseBody(body, inputFilePath, options);

        const output = escodegen.generate(AST) + '\n';

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
