(function ($) {

var ov = termkit.outputView;

/**
 * Represents a piece of output in an output view.
 */
ov.outputNode = function (properties, root) {

  this.properties = properties || {};
  this.id = String(this.properties.id || '');

  this.$element = this.$markup();
  this.$children = this.$element.find('.children');
  
  this.children = [];
  this.parent = null;
  this.root = root || this;
  
  this.map = {};
};

ov.outputNode.prototype = {

  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode"><div class="children"></div></div>').data('controller', this);
    var that = this;
    return $outputNode;
  },
  
  // Update markup to match.
  updateElement: function () {
    this.$element.data('controller', this);
  },
  
  // Pass-through length of array
  get length() {
    return this.children.length;
  },

  // Link up node.
  adopt: function (node) {
    node.root = this.root;
    node.parent = this;
    
    if (node.id != '') {
      this.map[node.id] = node;
    }
    
    node.updateElement();
  },

  // Detach node.
  detach: function (node) {
    node.root = null;
    node.parent = null;

    if (node.id != '') {
      delete this.map[node.id];
    }
  },
  
  // Insert node(s) inside this one.
  add: function (collection, pointer) {
    var that = this;

    // Prepare splice call.
    if (typeof pointer != 'number') {
      pointer = this.children.length;
    }
    var args = [ pointer, 0 ].concat(collection);

    // Allow both single object and array.
    $.each(oneOrMany(collection), function () {
      that.adopt(this);
    });

    // Insert elements.
    collection = collection.map(function (item) {
      return item.$element[0];
    });
    if (pointer >= this.children.length) {
      this.$children.append(collection);
    }
    else {
      this.$children.children()[pointer].before($(collection));
    }

    // Add elements.
    [].splice.apply(this.children, args);

    console.log('add', this.map);
  },

  // Remove node.
  remove: function (pointer) {
    // Self-remove?
    if (typeof pointer == 'undefined') {
      this.parent && this.parent.remove(this);
      return;
    }
    
    // Locate node.
    var index = this.indexOf(pointer);
    var node = this.children[index];

    if (node) {
      // Remove from child list.
      this.children.splice(index, 0);
      this.detach(node);

      // Remove element.
      node.$element.detach();
    }
  },

  // Replace self with another node(s).
  replace: function (collection, pointer) {
    // Self-replace
    if (typeof pointer == 'undefined') {
      var index = this.parent.indexOf(this);
      this.parent && this.parent.remove(index);
      this.parent.add(collection, index);
      return;
    }

    // Locate node.
    var index = this.indexOf(pointer);
    var node = this.children[index];

    this.remove(index);
    this.add(collection, index);
  },

  // Update node's own properties.
  update: function (properties, append) {
    if (append) {
      for (i in properties) {
        this.properties[i] += properties[i];
      }
    }
    else {
      this.properties = $.extend({}, this.properties, properties || {});
    }

    this.root && this.updateElement();
  },

  /**
   * Find target node.
   *
   * 'target' is an array of keys, matching one per level starting at this node.
   * Keys can be integers (node index) or strings (node IDs).
   */
  getNode: function (target) {
    if ((target == null) || (typeof target != 'object') || (target.constructor != [].constructor)) {
      target = [target];
    }
    key = target.shift();

    if (key == null) {
      return this;
    }
    
    var types = {
      string: 'map',
      number: 'children',
    };
    
    var node, hash = types[typeof key];

    if (hash) {
      node = this[hash][key];
    }

    if (node && target.length) {
      return node.getNode(target);
    }
    return node;
  },

  // Find index of given object in list.
  indexOf: function (object) {
    return (typeof object == 'number') ? object : $.inArray(object, this.children);
  },

  // Next iterator.
  next: function (object) {
    return this.children[this.indexOf(object) + 1];
  },

  // Previous iterator.
  prev: function (object) {
    return this.children[this.indexOf(object) - 1];
  },
  
  // Notify callback for events.
  notify: function (method, args) {
    this.root && this.root.view && this.root.view.notify(method, args);
  },

};

})(jQuery);