
/**
 * View bridge: lets you invoke view methods using clean syntax.
 */
exports.bridge = function (invoke) {
  this.invoke = invoke;
};

exports.bridge.prototype = {

  /**
   * Print view object (shortcut).
   */
  print: function (object) {
    this.add(null, object);
  },

  /**
   * Helper for formatting the target.
   */
  target: function (target, offset) {
    var args = {
      target: target,
    };
    if (typeof offset == 'numeric') {
      args.offset = offset;
    }
    return args;
  },

  /**
   * Add view object.
   */
  add: function (target, offset) {
    var args = this.target(target, offset);
    args.objects = exports.prepareOutput(arguments[arguments.length - 1]);
    this.invoke('view.add', args);
  },

  /**
   * Remove view object.
   */
  remove: function (target, offset) {
    var args = this.target(target, offset);
    this.invoke('view.remove', args);
  },

  /**
   * Replace view object.
   */
  replace: function (target, offset) {
    var args = this.target(target, offset);
    args.contents = exports.prepareOutput(arguments[arguments.length - 1]);
    this.invoke('view.replace', args);
  },

  /**
   * Update view object.
   */
  update: function (target, offset) {
    var args = this.target(target, offset);
    args.properties = arguments[arguments.length - 1];
    this.invoke('view.update', args);
  },

};


/**
 * Helper: unify output, apply formatters / shortcuts.
 */
exports.prepareOutput = function prepareOutput(object) {

  // Allow plain text output..
  if (object.constructor == "".constructor) {
    object = exports.rawOutput(null, object);
  }

  // Allow array of objects, if so, recurse.
  if (object.constructor == [].constructor) {
    for (i in object) {
      object[i] = prepareOutput(object[i]);
    }
  }

  return object;
}

/**
 * Container: block list
 */
exports.blockList = function (id, items) {
  return {
    type: 'blocklist',
    id: id || null,
    children: items || [],
  };
}

/**
 * Widget: raw output
 */
exports.rawOutput = function (id, contents) {
  return {
    type: 'raw',
    id: id || null,
    contents: contents,
  };
}

/**
 * Widget: file reference.
 */
exports.fileReference = function (name, path, stats) {
  
  return {
    type: 'file',
    name: name,
    path: path,
    stats: stats,
  };
};

