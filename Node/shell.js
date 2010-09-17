exports.shell = function (server, connection) {
  
  this._environment = {
    sessionId: 0,
    home: process.env.HOME,
    user: process.env.USER,
    path: process.env.PATH.split(':'),
    manPath: process.env.MANPATH,
    defaultShell: process.env.SHELL,
  };

};

exports.shell.prototype = {
  
  get id() {
    return this._environment.sessionId;
  },
  set id(id) {
    this._environment.sessionId = id;
  },
  
  get environment() {
    return this._environment;
  },
};