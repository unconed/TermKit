var termkit = {
  version: 1,
};
require.paths.unshift('./socket.io-node/lib');
require.paths.unshift('.');
require.paths.unshift('../Shared/');

// Load requirements.
var http = require('http'),  
    io = require('socket.io')
    router = require("router");

// Set up http server.
var server = http.createServer(function (request, result) { 
//  result.writeHeader(200, {'Content-Type': 'text/html'}); 
//  result.writeBody('<h1>TermKit</h1>');
//  result.finish(); 
});

server.listen(2222);

// Set up WebSocket and handlers.
var socket = io.listen(server); 
socket.on('connection', function (client) {
  var p = new router.router(client);
});
