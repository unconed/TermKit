(function ($) {
 
/**
 * Controller for progress bar.
 */
var pi = termkit.progress = function () {
  var that = this;

  this.$element = this.$markup();
  this._value = 0;
  this.min = 0;
  this.max = 100;
};

pi.prototype = {
  
  // Return active markup for this field.
  $markup: function () {
    var $progress = $('<div class="termkitProgress">').data('controller', this);
    var that = this;
    return $progress;
  },
  
  set value(value) {
    this._value = Math.max(this.min, Math.min(this.max, value));
  },
  get value() {
    return this._value;
  },
  
  updateElement: function () {
    this.value = this.value;
    this.$element.progressbar({ value: (this._value - this.min) / (this.max - this.min) * 100 });
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
