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
  
  add: function (session) {
    this.sessions[session.id] = session;
  },
  
  remove: function (session) {
    delete this.sessions[session.id];
  },

  dispatch: function (message) {
    
    if (message.query) {
      // client doesn't support queries.
      return;
    }
  
    // must be regular viewstream message.
    if (message.session) {
      var session = this.sessions[message.session];
      if (session) {
        session.dispatch(message.method, message.args);
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

