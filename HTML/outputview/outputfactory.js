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
 * Widget: File icon.
 *
 * Icon loading is collectively throttled.
 */
widgets.icon = function (properties) {
  
  // Initialize node.
  ov.outputNode.call(this, properties);
  
  this.updateElement();
  
  this.queue();
};

// Process icon updates.
widgets.icon.queue = [];
widgets.icon.limit = 4;
widgets.icon.process = function () {
  if (widgets.icon.queue.length && widgets.icon.limit > 0) {
    widgets.icon.limit--;
    
    var icon = widgets.icon.queue.shift();
    icon.process();
  }
};

widgets.icon.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode widgetIcon"></div>').data('controller', this);
    return $outputNode;
  },

  setDefaultIcon: function (callback) {
    var that = this;

    // Set default icon.
    var image = new Image(),
        extension = (this.properties.stats.mode & 0x4000) ? '...' : this.properties.name.split('.').pop(),
        defaultUrl = 'termkit-icon-default:///' + encodeURIComponent(extension);

    image.onload = function () {
      that.$element.css({
        background: 'url('+ defaultUrl +')',
        backgroundSize: '32px 32px',
      });
      callback && callback();
    };

    image.src = defaultUrl;
  },
  
  setOwnIcon: function (callback) {
    var that = this;

    // Set file-specific icon.
    var image = new Image(),
        path = this.properties.path + '/' + this.properties.name,
        previewUrl = 'termkit-icon-preview:///' + encodeURIComponent(path);

    image.onload = function () {
      that.$element.css({
        background: 'url('+ previewUrl +')'
      });
      callback && callback();
    };

    image.src = previewUrl;
  },
  
  // Queue icon updates to avoid choking webkit.
  queue: function () {
    widgets.icon.queue.push(this);
    widgets.icon.process();
  },
  
  // Process the icon update.
  process: function () {
    function yield() {
      widgets.icon.process();
    }
    
    this.setOwnIcon(yield);
    
    widgets.icon.limit++;
  },
  
  // Update markup to match.
  updateElement: function () {
    var that = this;

    this.setDefaultIcon();

    this.$element.data('controller', this);
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

  this.icon = new widgets.icon(this.properties);
  this.$icon.append(this.icon.$element);
  this.icon.updateElement();

  this.updateElement();
};

widgets.file.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode widgetFile" draggable="true"><div class="icon"></div><div class="name"></div><div class="meta"></div></div>').data('controller', this);
    var that = this;
    return $outputNode;
  },
  
  // Update markup to match.
  updateElement: function () {
    var that = this;

    this.$element.data('controller', this);

    // Set text labels.
    this.$name.text(this.properties.name);
    this.$meta.text(formatSize(this.properties.stats.size));
    
    if (this.properties.name[0] == '.') {
      this.$element.addClass('file-hidden');
    }
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