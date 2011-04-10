(function ($) {

/**
 * NodeKit client.
 */
var tc = termkit.client = function () {
  var that = this;
  
  // Keep track of sessions.
  this.sessions = {};
  
  // Set up event handlers.
  this.onConnect = function () {};
  this.onDisconnect = function () {};

  // Set up socket with back-end.
  var s = this.socket = new io.Socket('localhost', { port: 2222 }); 
  
  // Use shared protocol handler with back-end.
  this.protocol = new termkit.protocol(this.socket, this);
  s.on('connect', function () {
    // TODO: Handshake
    that.onConnect();
  }); 
  s.on('disconnect', function() {
    that.onDisconnect();
  }); 

  // Open connection.
  s.connect();
};

tc.prototype = {
  
  register: function (session, handler) {
    this.sessions[session.session] = handler;
  },
  
  deregister: function (session) {
    delete this.sessions[session.session];
  },

  dispatch: function (message) {
    
    if (message.query) {
      // client doesn't support queries.
      return;
    }
  
    // must be regular viewstream message.
    if (message.session) {
      var handler = this.sessions[message.session];
      if (handler) {
        handler(message);
      }
    }
  },

  // Invoke a method on the server.
  query: function (method, args, session, callback) {
    this.protocol.query(method, args, { session: session }, callback);
  },

  // Send a notification message.
  notify: function (method, args, session) {
    this.protocol.notify(method, args, { session: session });
  },

};

})();

