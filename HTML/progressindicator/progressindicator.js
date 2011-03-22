(function ($) {
 
/**
 * Controller for progress indicator.
 */
var pi = termkit.progressIndicator = function (stream) {
  var that = this;

  this.$element = this.$markup();
};

pi.prototype = {
  
  // Return active markup for this field.
  $markup: function () {
    var $progressIndicator = $('<div class="termkitProgressIndicator">').data('controller', this);
    var that = this;
    return $progressIndicator;
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
