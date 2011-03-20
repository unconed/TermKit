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

    this.send({ sessionId: sessionId, sequence: sequence, method: method, args: args });
  },
  
  // Pass a message to the server.
  send: function (message) {
    var json = JSON.stringify(message);
//    console.log('sending '+json);
    this.socket.send(json);
  },  

  // Receive a message from the server.
  receive: function (data) {
    // Parse incoming message.
    var message = JSON.parse(data);
    if (message && message.sessionId && message.sequence && message.method && message.args) {
      // Verify arguments.
      if (typeof message.sequence == 'number') {
        // Locate handler for method and execute.
        var handler = this.handlers[message.sequence];
        if (handler) {
          var prefix = message.method.split('.')[0];
          if (prefix == 'return') {
            handler.Return && handler.Return(message.args.data, message.args.code, message.args.status, message.sessionId);
            // Clean-up callbacks.
            delete this.handlers[sequence];
          }
          else {
            handler[prefix] && handler[prefix](message.method, message.args);
          }
        }
      }
    }
  },
};

})();

