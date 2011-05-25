var view = require('view/view');

exports.main = function (tokens, pipes, exit) {
  
  pipes.viewOut('view.clear');

  exit(true);
};
