(function ($) {

var ov = termkit.outputView;

/**
 * Constructs node objects of the right class.
 */
ov.outputFactory = function () {

};

ov.outputFactory.prototype = {

  // Construct a tree of view objects.
  tree: function (objects) {
    var that = this;
    return oneOrMany(objects).map(function (node) { return that.construct(node); });
  },

  construct: function (properties) {
    var type = widgets[properties.type] || ov.outputNode,
        node = new type(properties),
        that = this;

    if (node.properties.children) {
      var nodes = node.properties.children.map(function (node) {
        return that.construct(node);
      });
      delete node.properties.children;
      node.add(nodes);
    }
    
    return node;
  },

};

var widgets = ov.outputFactory.widgets = {};

///////////////////////////////////////////////////////////////////////////////

/**
 * Widget: Raw output
 */
widgets.raw = function (properties) {
  
  // Initialize node.
  ov.outputNode.call(this, properties);
  
  this.$contents = this.$element.find('.contents');
  this.updateElement();
};

widgets.raw.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode widgetRaw"><div class="contents"></div></div>').data('controller', this);
    var that = this;
    return $outputNode;
  },

  // Update markup to match.
  updateElement: function () {
    this.$contents.text(this.properties.contents);
    this.$element.data('controller', this);
    
    this.notify('view.callback', { raw: 'foo' });
  },
  
});


/**
 * Widget: File reference
 */
widgets.file = function (properties) {
  
  // Initialize node.
  ov.outputNode.call(this, properties);
  
  this.$icon = this.$element.find('.icon');
  this.$name = this.$element.find('.name');
  this.$meta = this.$element.find('.meta');
  this.updateElement();
};

widgets.file.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode widgetFile"><div class="icon"></div><div class="name"></div><div class="meta"></div></div>').data('controller', this);
    var that = this;
    return $outputNode;
  },

  // Update markup to match.
  updateElement: function () {
    var that = this;

    this.$element.data('controller', this);

    // Set default icon.
    var extension = (this.properties.stats.mode & 0x4000) ? '/' : this.properties.name.split('.').pop(),
        defaultUrl = 'termkit-icon-default:///' + encodeURIComponent(extension);
    this.$icon.css({
      background: 'url('+ defaultUrl +')',
      backgroundSize: '32px 32px',
    });
    
    // Set file-specific icon.
    var image = new Image(),
        path = this.properties.path + '/' + this.properties.name,
        previewUrl = 'termkit-icon-preview:///' + encodeURIComponent(path);
    image.onload = function () {
      that.$icon.css({
        background: 'url('+ previewUrl +')'
      });
    };
    image.src = previewUrl;
    
    // Set text labels.
    this.$name.text(this.properties.name);
    this.$meta.text(formatSize(this.properties.stats.size));
  },
  
});

/**
 * Container: list
 */
widgets.list = function (properties) {
  
  // Initialize node.
  ov.outputNode.call(this, properties);

  this.updateElement();
};

widgets.list.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode list"><div class="children"></div></div>').data('controller', this);
    var that = this;
    return $outputNode;
  },

  // Update markup to match.
  updateElement: function () {
    this.$element.data('controller', this);
  },
  
});

})(jQuery);