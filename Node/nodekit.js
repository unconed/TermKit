#!/usr/bin/env node
var termkit = {
  version: 1,
};

require.paths.unshift(__dirname + '/../Shared/');

// Load requirements.
var http = require('http'),  
    io = require('socket.io-node'),
    router = require("./router");

// Load config file.
var config = require('./config').getConfig();

// Set up http server.
var server = http.createServer(function (request, result) { 
//  result.writeHeader(200, {'Content-Type': 'text/html'}); 
//  result.writeBody('<h1>TermKit</h1>');
//  result.finish(); 
});

server.listen(2222);

// Set up WebSocket and handlers.
var ioServer = io.listen(server); 
ioServer.sockets.on('connection', function (client) {
  var p = new router.router(client);
});
