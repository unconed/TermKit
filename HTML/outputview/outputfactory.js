(function ($) {

var ov = termkit.outputView;

/**
 * Constructs node objects of the right class.
 */
ov.outputFactory = function () {

};

ov.outputFactory.prototype = {

  construct: function (properties) {
    var type = widgets[properties.type];
    if (type) {
      return new type(properties);
    }
  },

};

var widgets = ov.outputFactory.widgets = {};

///////////////////////////////////////////////////////////////////////////////

/**
 * Raw output
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

})(jQuery);