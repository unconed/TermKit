(function ($) {

/**
 * NodeKit client.
 */
var tc = termkit.client = function () {
  var self = this;
  
  // Prepare callback map.
  this.handlers = {};
  this.nextId = 1;

  // Set up event handlers.
  this.onConnect = function () {};
  this.onDisconnect = function () {};

  // Set up socket with back-end.
  var s = this.socket = new io.Socket('localhost', { port: 2222 }); 
  s.on('connect', function () {
    // TODO: Handshake
    self.onConnect();
  }); 
  s.on('disconnect', function() {
    self.onDisconnect();
  }); 

  // Message processing loop.
  s.on('message', function (data) {
    self.receive(data);
  }); 

  // Open connection.
  s.connect();
};

tc.prototype = {
  // Invoke a method on the server.
  invoke: function (method, args, returnCallback, handlers, sessionId) {
    handlers = handlers || {};
    handlers.Return = returnCallback;

    var sequence = this.nextId++;
    this.handlers[sequence] = handlers;

    this.send(sessionId, sequence, method, args);
  },
  
  // Pass a message to the server.
  send: function (sessionId, sequence, method, args) {
    var json = JSON.stringify([ sessionId, sequence, method, args ]);
    console.log('sending '+json);
    this.socket.send(json);
  },  

  // Receive a message from the server.
  receive: function (data) {
    // Parse incoming message.
    var message = JSON.parse(data);
    if (message && message.length) {
      var sessionId = message[0],
          sequence = message[1],
          method = message[2],
          args = message[3];

      console.log('received '+data);

      // Verify arguments.
      if (typeof message[1] == 'number') {
        // Locate handler for method and execute.
        var handler = this.handlers[sequence];
        if (handler) {
          var prefix = method.split('.')[0];
          if (prefix == 'return') {
            handler.Return && handler.Return(args.data, args.code, args.status, sessionId);
            // Clean-up callbacks.
            delete this.handlers[sequence];
          }
          else {
            handler[prefix] && handler[prefix](method, args);
          }
        }
      }
    }
  },
};

})();

