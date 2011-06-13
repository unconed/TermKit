var view = require('view/view');

exports.main = function (tokens, pipes, exit, environment) {
  
  pipes.viewOut('shell.clear');

  exit(true);
};
