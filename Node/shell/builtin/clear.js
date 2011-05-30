var view = require('view/view');

exports.main = function (tokens, pipes, exit, environment) {
  
  pipes.viewOut('view.clear');

  exit(true);
};
