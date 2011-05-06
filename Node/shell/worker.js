require.paths.unshift('.');
require.paths.unshift('..');
require.paths.unshift('shell');

var processor = require('processor');

// Change to home directory.
process.chdir(process.env.HOME);

// Set up processor.
var p = new processor.processor(process.openStdin(), process.stdout);
