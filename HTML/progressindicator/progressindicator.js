(function ($) {

$.fn.termkitProgressIndicator = function (options) {
  var $container = this;

  // Parse options.
  var defaults = {
  };
  options = $.extend({}, defaults, options);

  // Create controller for field.
  var input = new termkit.progressIndicator();
  $container.append(input.$element);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Controller for progress indicator.
 */
var pi = termkit.progressIndicator = function (stream) {
  var self = this;

  this.$element = this.$markup();
};

pi.prototype = {
  
  // Return active markup for this field.
  $markup: function () {
    var $progressIndicator = $('<div class="termkitProgressIndicator">').data('controller', this);
    var self = this;
    return $progressIndicator;
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
