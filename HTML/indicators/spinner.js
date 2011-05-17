(function ($) {
 
/**
 * Controller for spinner.
 */
var pi = termkit.spinner = function () {
  var that = this;

  this.$element = this.$markup();
};

pi.prototype = {
  
  // Return active markup for this field.
  $markup: function () {
    var $spinner = $('<div class="termkitSpinner">').data('controller', this);
    var that = this;
    return $spinner;
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
