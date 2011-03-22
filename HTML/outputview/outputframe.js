(function ($) {

/**
 * Controller for output frame.
 */
var of = termkit.outputView.outputFrame = function () {
  var that = this;

  this.$element = this.$markup();
  this.views = [];
};

of.prototype = {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputFrame = $('<div class="termkitOutputFrame"></div>').data('controller', this);
    var that = this;
    
    return $outputFrame;
  },

  // Hook into the given set of handlers.
  hook: function (handlers) {
    var that = this;
    handlers = handlers || {};
    handlers['view'] = function (m,a) { that.viewHandler(m, a); };
    return handlers;
  },

  viewHandler: function (method, args) {
    var subview = args.subview || 0;
    this.allocate(subview + 1);
    this.views[subview].viewHandler(method, args);
  },

  // Update the element's markup in response to internal changes.
  allocate: function (subviews) {
    if (this.views.length < subviews) {
      subviews -= this.views.length;
      while (subviews--) {
        this.views.push(new termkit.outputView());
        this.$element.append(this.views[this.views.length - 1].$element);
      };
    }
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
