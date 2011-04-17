
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
      offset: offset,
    };
    return args;
  },

  /**
   * Add objects to a view object.
   */
  add: function (target, objects, offset) {
    var args = this.target(target, offset);
    args.objects = exports.prepareOutput(objects, true);
    this.invoke('view.add', args);
  },

  /**
   * Remove view object.
   */
  remove: function (target) {
    var args = this.target(target);
    this.invoke('view.remove', args);
  },

  /**
   * Replace an object with another view object.
   */
  replace: function (target, objects) {
    var args = this.target(target);
    args.objects = exports.prepareOutput(objects, true);
    this.invoke('view.replace', args);
  },

  /**
   * Update view object.
   */
  update: function (target, properties, append) {
    var args = this.target(target);
    args.properties = properties;
    args.append = !!append;
    this.invoke('view.update', args);
  },

};


/**
 * Helper: unify output, apply formatters / shortcuts.
 */
exports.prepareOutput = function prepareOutput(object, wrap) {

  // Allow plain text output..
  object = object || '';
  if (object.constructor == "".constructor) {
    object = exports.raw(null, object);
  }

  // Allow array of objects, if so, recurse.
  if (object.constructor == [].constructor) {
    for (i in object) {
      object[i] = prepareOutput(object[i]);
    }
    return object;
  }
  else {
    return wrap ? [object] : object;
  }

}

/**
 * Container: item list
 */
exports.list = function (id, items) {
  return {
    type: 'list',
    id: id || null,
    children: items || [],
  };
}

/**
 * Widget: raw output
 */
exports.raw = exports.view = function (id, contents) {
  return {
    type: 'raw',
    id: id || null,
    contents: contents || '',
  };
}

/**
 * Widget: file reference.
 */
exports.file = function (name, path, stats) {
  
  return {
    type: 'file',
    name: name,
    path: path,
    stats: stats,
  };
};

