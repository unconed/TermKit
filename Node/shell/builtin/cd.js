var view = require('view/view'),
    expandPath = require('misc').expandPath;

exports.main = function (tokens, pipes, exit, environment) {

  var out = new view.bridge(pipes.viewOut);
  
  // Validate syntax.
  if (tokens.length > 2) {
    out.print('Usage: cd [dir]');
    return exit(false);
  }
  var path = tokens[1] || '~';
  
  // Complete path
  expandPath(path, function (path) {
    // Try to change working dir.
    try {
      process.chdir(path);
    }
    catch (error) {
      out.print(error.message + ' (' + path + ')');
      return exit(false);
    }

    exit(true);
  }); // expandPath
};
