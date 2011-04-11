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
  get: function (i, callback) {
    this.allocate(i + 1);
    return this.views[i];
  },
  
  // Remove all views.
  remove: function () {
    this.$element.remove();
  },

  // Update the element's markup in response to internal changes.
  allocate: function (views) {
    console.log('allocate from', this.views.length, ' to ', views);
    if (this.views.length < views) {
      views -= this.views.length;
      while (views--) {
        this.views.push(new termkit.outputView());
        this.$element.append(this.views[this.views.length - 1].$element);
        console.log('allocate -- ', this.views.length, views);
      };
    }
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
