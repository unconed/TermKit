var termkit = {
  version: 1,
};
require.paths.unshift('./socket.io-node/lib');
require.paths.unshift('.');

// Load requirements.
var http = require('http'),  
    io = require('socket.io')
    processor = require("processor");

// Set up http server.
var server = http.createServer(function (request, result) { 
 result.writeHeader(200, {'Content-Type': 'text/html'}); 
 result.writeBody('<h1>TermKit</h1>');
 result.finish(); 
});

server.listen(2222);

// Set up WebSocket and handlers.
var socket = io.listen(server); 
socket.on('connection', function (client) {
  var p = new processor.router(server, client);
});

/*
server.addListener("connection", function (connection) {
  // Version check
  var version = connection.headers['x-termkit'];
  if (version && (parseInt(version) <= termkit.version)) {
    // Set up processor.
    var p = new processor(server, connection);
    // Accept stream
    connection.addListener("message", function (data) {
      p.message(data);
    });
  }
  else {
    connection.close();
  }
});

server.listen(2222);

*/
