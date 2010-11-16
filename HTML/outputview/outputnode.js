(function ($) {

var ov = termkit.outputView;

/**
 * Represents a piece of output in an output view.
 */
ov.outputNode = function (properties) {

  this.properties = properties || {};
  this.id = String(this.properties.id || '');

  this.$element = this.$markup();
  this.$children = this.$element.find('.children');
  
  this.children = [];
  this.parent = null;
  this.root = this;
  
  this.index = {};
};

ov.outputNode.prototype = {

  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode"><div class="children"></div></div>').data('controller', this);
    var self = this;
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

  // Adopt node index.
  mergeIndex: function (node) {
    for (id in node.index) {
      this.index[id] = node.index[id];
    }
  },

  // Adopt node index.
  unmergeIndex: function (node) {
    for (id in node.index) if (this.index[id]) {
      delete this.index[id];
    }
  },
  
  // Index node.
  indexNode: function (node) {
    if (node.id.length > 0) {
      this.index[node.id] = node;
    }
  },

  // Unindex node.
  unindexNode: function (node) {
    if (node.id.length > 0 && this.index[node.id]) {
      delete this.index[node.id];
    }
  },
  
  // Link up node.
  adopt: function (node) {
    node.root = this.root;
    node.parent = this;
    
    this.root.indexNode(node);
    this.root.mergeIndex(node);

    node.updateElement();
  },

  // Detach node.
  detach: function (node) {
    node.root = node;
    node.parent = null;
    
    this.root.unindexNode(node);
    this.root.unmergeIndex(node);
  },
  
  // Insert node(s) inside this one.
  add: function (collection, index) {
    var self = this;

    // Prepare splice call.
    if (typeof index != 'number') {
      index = this.children.length;
    }
    var args = [ index, 0 ].concat(collection);

    // Allow both single object and array.
    $.each(oneOrMany(collection), function () {
      self.adopt(this);
    });

    // Insert elements.
    collection = collection.map(function (item) {
      return item.$element[0];
    });
    if (index >= this.children.length) {
      this.$children.append(collection);
    }
    else {
      this.$children.children()[index].before($(collection));
    }

    // Add elements.
    [].splice.apply(this.children, args);

  },

  // Remove node at index.
  remove: function (index) {
    // Locate node.
    var index = this.indexOf(index);
    var node = this.children[index];

    if (node) {
      // Remove from child list.
      this.children.splice(index, 0);
      self.detach(node);

      // Remove element.
      node.$element.detach();
    }
  },

  // Replace child node with this one.
  replace: function (node, index) {
    this.remove(index);
    this.add(node, index)
  },

  // Find index of given command in list.
  getNode: function (id) {
    return (typeof id == 'string' && id != '' && this.root.index[id]) || this;
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

};

})(jQuery);