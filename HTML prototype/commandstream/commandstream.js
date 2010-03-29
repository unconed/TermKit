(function ($) {

$.fn.termkitCommandStream = function (options) {
  var $container = this;

  // Don't process same field twice.
  if ($container.is('.termkitCommandStream')) return;
  $container.addClass('termkitCommandStream');  

  // Parse options.
  var defaults = {
  };
  options = $.extend({}, defaults, options);

  // Create input manager for field.
  var input = new termkit.commandStream($container[0]);
}

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
