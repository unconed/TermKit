require.paths.unshift('.');
require.paths.unshift('..');
require.paths.unshift('shell');

var processor = require('processor');

// Set up processor.
var p = new processor.processor(process.openStdin(), process.stdout);