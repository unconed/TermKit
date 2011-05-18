var shell = require('./shell');
var returnMeta = require('./misc').returnMeta;
var protocol = require('protocol');

/**
 * Processes incoming messages on a connection, routes them to active sessions.
 */
exports.router = function (connection) {
  var that = this;

  this.protocol = new protocol.protocol(connection, this, true);

  this.sessions = {};
  this.counter = 1;
};

exports.router.prototype = {
  
  dispatch: function (message) {
    // Look up session.
    var that = this,
        session = message.session && this.getSession(message.session);
        returned = false,
    
      // Define convenient answer callback.
        exit = function (success, object, meta) {
          if (!returned) {
            meta = meta || {};
            meta.session = message.session;
            meta.success = success;
            
            that.protocol.answer(message.query, object, meta);
            returned = true;
          }
        };

    // Find handler.
    var handler = exports.handlers[message.method];
    if (handler) {
      handler.call(this, session, message.query, message.args || {}, exit);
      return;
    }
    
    // Else forward to session.
    session.dispatch(message.query, message.method, message.args || {}, exit);
    
  },
  
  forward: function (message) {
    this.protocol.notify(null, null, message);
  },

  disconnect: function () {
    for (i in this.sessions) {
      this.sessions[i].close();
    }
    this.sessions = {};
    this.protocol = null;
  },

  getSession: function (id) {
    for (i in this.sessions) {
      if (i == id) return this.sessions[id];
    }
  },
  
  addSession: function (session) {
    var id = session.id = this.counter++;
    this.sessions[id] = session;
  },

  removeSession: function (session) {
    delete this.sessions[session.id];
  },
};

/**
 * Method handlers.
 */
exports.handlers = {
  'session.open.shell': function (session, query, args, exit) {
    try {
      var session = new shell.shell(args, this);
      this.addSession(session);
      exit(true, { session: session.id });
    }
    catch (e) {
      exit(false);
    }
  },
  
  'session.close': function (session, query, args, exit) {
    if (session) {
      session.close();
      this.removeSession(session);
      exit(true);
    }
    else {
      exit(false);
    }
  },
};
