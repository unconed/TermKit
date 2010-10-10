(function ($) {

var ov = termkit.outputView;

/**
 * Constructs node objects of the right class.
 */
ov.outputFactory = function () {

};

ov.outputFactory.prototype = {

  construct: function (properties) {
    var type = widgets[properties.type] || ov.outputNode;
    return new type(properties);
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
  
  this.$contents = this.$element.find('> div.contents');
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
    this.$contents.text(this.contents);
    this.$element.data('controller', this);
  },
  
});


/**
 * Widget: File reference
 */
widgets.file = function (properties) {
  
  // Initialize node.
  ov.outputNode.call(this, properties);
  
  this.$icon = this.$element.find('> div.icon');
  this.$name = this.$element.find('> div.name');
  this.$meta = this.$element.find('> div.meta');
  
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
    this.$name.text(this.name);
    this.$meta.text(this.stats.size);
  },
  
});

/**
 * Container: Item list
 */
widgets.itemList = function (properties) {
  
  // Initialize node.
  ov.outputNode.call(this, properties);
  
  this.$contents = this.$element.find('> div.contents');
};

widgets.itemList.prototype = $.extend(new ov.outputNode(), {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputNode = $('<div class="termkitOutputNode itemList"><div class="contents"></div></div>').data('controller', this);
    var self = this;
    return $outputNode;
  },

  // Update markup to match.
  updateElement: function () {
    this.$contents.text(this.contents);
    this.$element.data('controller', this);
  },
  
});

})(jQuery);