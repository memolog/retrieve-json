#!/usr/bin/env node

'use strict;';

const program = require('commander');
const retriveJSONData = require('./index');
const pkg = require('./package.json');

function main(args) {
  program
    .version(pkg)
    .version(pkg.version)
    .option('-i, --input <file')
    .option('-o, --output <file>')
    .option('--prefix <string>')
    .option('--stdout')
    .option('--override')
    .parse(args);

  retriveJSONData(program.input, {
    output: program.output,
    dist: program.dist,
    override: program.override,
    prefix: program.prefix
  })
    .then(output => {
      if (program.stdout) {
        process.stdout.write(output);
      }
      process.exit(0);
    })
    .catch(err => {
      process.stderr.write(err + '\n');
      process.exit(1);
    });
}

if (require.main === module) {
  main(process.argv);
}

module.exports = main;
