#!/usr/bin/env node
'use strict;';
var program = require('commander');
var retriveJSONData = require('./index');
var pkg = require('../package.json');
function main(args) {
    program
        .version(pkg.version)
        .option('-i, --input <file')
        .option('-o, --output <file>')
        .option('--prefix <string>')
        .option('--stdout')
        .option('--override')
        .option('--fallback')
        .parse(args);
    retriveJSONData(program.input, {
        output: program.output,
        dist: program.dist,
        override: program.override,
        prefix: program.prefix,
        fallback: program.fallback
    })
        .then(function (output) {
        if (program.stdout) {
            process.stdout.write(output);
        }
        process.exit(0);
    })
        .catch(function (err) {
        process.stderr.write(err + '\n');
        process.exit(1);
    });
}
if (require.main === module) {
    main(process.argv);
}
module.exports = main;
