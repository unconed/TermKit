(function ($) {

var ov = termkit.outputView;

/**
 * Constructs node objects of the right class.
 */
ov.outputFactory = function () {

};

ov.outputFactory.prototype = {

  construct: function (properties) {
    var type = widgets[properties.type] || ov.outputNode,
        node = new type(properties);
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
};

widgets.raw.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode widgetRaw"><div class="contents"></div></div>').data('controller', this);
    var self = this;
    return $outputNode;
  },

  // Update markup to match.
  updateElement: function () {
    this.$contents.text(this.properties.contents);
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
  
};

widgets.file.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode widgetFile"><div class="icon"></div><div class="name"></div><div class="meta"></div></div>').data('controller', this);
    var self = this;
    return $outputNode;
  },

  // Update markup to match.
  updateElement: function () {
    this.$element.data('controller', this);

    this.$icon;
    this.$name.text(this.properties.name);
    this.$meta.text(formatSize(this.properties.stats.size));
  },
  
});

/**
 * Container: Item list
 */
widgets.itemList = function (properties) {
  
  // Initialize node.
  ov.outputNode.call(this, properties);
};

widgets.itemList.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode itemList"><div class="children"></div></div>').data('controller', this);
    var self = this;
    return $outputNode;
  },

  // Update markup to match.
  updateElement: function () {
    this.$element.data('controller', this);
  },
  
});

})(jQuery);