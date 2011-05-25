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

  // Get the n'th view in the frame.
  get: function (i) {
    this.allocate(i + 1);
    return this.views[i];
  },
  
  // Remove this element.
  remove: function () {
    this.$element.remove();
  },
  
  // Remove all views.
  clear: function () {
    for (i in this.views) {
      this.views[i].remove();
    }
    this.views = [];
  },

  // Update the element's markup in response to internal changes.
  allocate: function (views) {
    var that = this;
    
    if (this.views.length < views) {
      views -= this.views.length;
      while (views--) {
        this.views.push(new termkit.outputView());
        this.$element.append(this.views[this.views.length - 1].$element);
      };
    }
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
