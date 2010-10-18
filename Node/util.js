/**
 * Process shortcut return values
 *
 * Accepts input of the forms:
 *
 *  false, null, undefined, 0 (success)
 *  true, 1 (error)
 *  exitCode (integer, specific error)
 *  [ exitCode, data ] (integer exitCode + object to return)
 *  
 * 
 */
exports.returnObject = function (code, data) {
  var object = { status: 'ok', code: 0 };
  
  if (code === false || code === null || code === undefined) {
    object = { status: 'ok', code: 0 };
  }
  else if (code === true) {
    object = { status: 'error', code: 1 };
  }
  else if (typeof code == 'number') {
    object = { status: !code ? 'ok' : 'error', code: code };
  }

  if (data !== undefined) {
    object[data] = data;
  }

  return object;
};

exports.composePath = function (name, path) {
  if (path != '' && path !== undefined && path !== null) {
    name = path.replace(/\/$/, '') +'/'+ name;
  };
  return name;
};

/**
 * Generator for decorator to track asynchronous tasks.
 *
 * Allows you to execute a complicated dynamic callback hierarchy and call a handler when all tasks have finished.
 */
exports.whenDone = function (done) {
  // Initialize closure variable.
  var count = 0,
  // Store additional arguments.
      done_args = [].slice.call(arguments, 1);
  return function (callback) {
    // Register new task.
    count++;
    // Decorate callback with exit-checker.
    return function () {
      callback.apply(this, arguments);
      if (--count == 0) {
        done.apply(this, done_args);
      }
    }
  }
}

