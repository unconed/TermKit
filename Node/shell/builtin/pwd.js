var view = require('view/view');

exports.main = function (tokens, pipes, exit, environment) {
  var out = new view.bridge(pipes.viewOut);

  var cwd = process.cwd();
  out.print('Working Directory: ' + cwd);
  
  exit(true);
};