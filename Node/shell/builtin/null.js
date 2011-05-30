var view = require('view/view');

exports.main = function (tokens, pipes, exit, environment) {
  var out = new view.bridge(pipes.viewOut);
  out.print('Unknown command "' + tokens[0] + '"');
  return exit(false);
}
