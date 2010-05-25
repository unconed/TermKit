(function ($) {

$.fn.termkitCommandStream = function (options) {
  var $container = this;

  // Don't process same field twice.
  if ($container.is('.termkitCommandStream')) return;

  // Parse options.
  var defaults = {
  };
  options = $.extend({}, defaults, options);

  // Create input manager for field.
  var input = new termkit.commandStream($container[0]);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Input manager for token-based field.
 */
var cs = termkit.commandStream = function (stream) {
  var self = this;
  var $stream = this.$stream = $(this.stream = stream);

  $stream.addClass('termkitCommandStream');  
  
  this.commandList = new cs.commandList(this.$stream);
  
  this.newCommand();
  this.newCommand();
  this.commandList.refreshStream();
};

cs.prototype = {
  
  newCommand: function () {
    this.commandList.add(new cs.command());
  },
  
  // Respond to mouse clicks.
  foo: function (event) {
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
