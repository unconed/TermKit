var EventEmitter = require('events').EventEmitter,
    extend = require('./misc').extend,
    composePath = require('./misc').composePath,
    fs = require('fs'),
    singleton;

//var config = require('config').getConfig();

/**
 * Static accessor.
 */
exports.getConfig = function (paths) {
  if (!singleton) {
    singleton = new exports.configStore(paths);
  }
  return singleton.config;
};

/**
 * Config store, backs to .termkit.json.
 */
exports.configStore = function (paths) {
  
  // Default.
  paths = paths || [];
  this.path = process.env.HOME;
  this.file = '.TermKit.json';

  // Detect mac.
  var mac;
  try {
    var appSupport = composePath('Library/Application Support', process.env.HOME),
        termkitSupport = composePath('TermKit', appSupport);

    // Look for Application Support (detect mac).
    fs.statSync(appSupport);
    mac = true;
    this.file = 'TermKit.json';
    
    // Create TermKit folder if not exists.
    try {
      fs.statSync(termkitSupport);
    } catch (e) {
      fs.mkdir(termkitSupport, 0755);
    };

    // Add to search locations.
    paths.push(termkitSupport);
    this.path = termkitSupport;
  }
  catch (e) {  };

  // Look in user home directory.
  paths.push(process.env.HOME);
  
  // Iterate over search paths.
  var path, json;
  for (i in paths) {
    var file = composePath(this.file, paths[i]);
    try {
      json = fs.readFileSync(file, 'utf8');
      this.path = paths[i];
    }
    catch (e) {
      continue;
    }
    break;
  }
  
  // Create config object.
  var data = {};
  try {
    if (json) {
      data = JSON.parse(json);
    }
  } catch (e) { throw 'Unable to parse config file "' + composePath(this.file, this.path) + '"'; };

  this.config = new exports.configValues(data, this);
};

exports.configStore.prototype = {
  
  update: function (values) {

    // Fire and forget save.
    var json = JSON.stringify(values);
    var file = composePath(this.file, this.path);
    fs.writeFile(file, json, 'utf8');
  },
  
};

/**
 * Configuration state.
 */
exports.configValues = function (values, store) {
  this.values = values;
  this.store = store;
};

exports.configValues.prototype = extend(new EventEmitter(), {

  // path = [ 'foo', 'bar' ] => values[foo][bar]
  
  replace: function (values) {
    this.values = values;

    this.store.update(this.values);
    this.emit('change', this.values);
  },
  
  "set": function (path, value) {
    
    var obj = this.values,
        tail = path.pop();

    // Descend path of keys.
    for (var i in path) {
      var child = obj[path[i]];
      if (!child) {
        child = obj[path[i]] = {};
      }
      obj = child;
    }
    obj[tail] = value;
    
    this.store.update(this.values);
    this.emit('change', this.values);
  },
  
  "get": function (path) {
    
    if (typeof path == 'undefined' || path === null) {
      return this.values;
    }
    
    var obj = this.values,
        tail = path.pop();

    // Descend path of keys.
    for (var i in path) {
      var child = obj[path[i]];
      if (!child) {
        return null;
      }
      obj = child;
    }
    return obj[tail];
  },
  
});

