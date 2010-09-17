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
    self.message(data);
  }); 

  // Open connection.
  s.connect();
};

tc.prototype = {
  invoke: function (method, args, returnCallback, viewCallback) {
    var sequence = this.nextId++;
    this.handlers[sequence] = {
      ret: returnCallback,
      view: viewCallback,
    };
    console.log(method);
    this.send(method, sequence, args);
  },
  
  send: function (method, sequence, args) {
    var json = JSON.stringify([ method, sequence, args ]);
    this.socket.send(json);
  },  

  message: function (data) {
    // Parse incoming message.
    var message = JSON.parse(data);
    if (message && message.length) {
      var method = message[0],
          sequence = message[1],
          args = message[2];

      // Verify arguments.
      if (typeof message[1] == 'number') {
        // Locate handler for method and execute.
        var handler = this.handlers[sequence];
        if (handler) {
          if (method == 'return') {
            handler.ret && handler.ret(args.data, args.code, args.status);
            // Clean-up callbacks.
            delete this.handlers[sequence];
          }
          else {
            handler.view && handler.view(method, args);
          }
        }
      }
    }
  },
};

})();

