(function ($) {

var ov = termkit.outputView;

/**
 * Manages the list of executed commands.
 */
ov.outputNode = function (properties) {

  properties = properties || {};
  for (i in properties) this[i] = properties[i];

  this.$element = this.$markup();
  this.$children = $([]);
  
  this.children = [];
  this.parent = null;
  this.root = this;
  
  this.index = {};
};

ov.outputNode.prototype = {

  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode"></div>').data('controller', this);
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

  // Update children to match.
  updateChildren: function () {
    var self = this;

    // Detach children.
    this.$children.detach();
    this.$children = $([]);
    
    // Re-attach based on children array.
    $.each(this.children, function () {
      self.$children = self.$children.add(this.$element);
      self.$element.append(this.$element);
      
      this.updateElement();
    });
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
    if (typeof node.id == 'string' && node.id.length > 0) {
      this.index[node.id] = node;
    }
  },

  // Unindex node.
  unindexNode: function (node) {
    if (typeof node.id == 'string' && node.id.length > 0 && this.index[node.id]) {
      delete this.index[node.id];
    }
  },
  
  // Link up node.
  adopt: function (node) {
    node.root = this.root;
    node.parent = this;
    
    node.parent.updateChildren();
    
    this.root.indexNode(node);
    this.root.mergeIndex(node);
  },

  // Detach node.
  detach: function (node) {
    node.$element.detach();
    
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