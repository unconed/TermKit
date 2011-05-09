var view = require('view/view');

exports.main = function (tokens, pipes, exit) {
  var out = new view.bridge(pipes.viewOut);

  tokens.shift();
  out.print(tokens.join(' '));

  exit(true);
};
