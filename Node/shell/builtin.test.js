// Load requirements.
require.paths.unshift('.');
require.paths.unshift('..');
var builtin = require('builtin');

builtin.shellCommands.ls([ 'ls' ], function (method, args) {
  console.log('invoke', method, args, arguments);
}, function (code) {
  console.log('exit', code, arguments);
});