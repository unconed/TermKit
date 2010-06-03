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
  var input = new termkit.commandStream();
  $container.append(input.$element);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Input manager for token-based field.
 */
var cs = termkit.commandStream = function (stream) {
  var self = this;

  this.$element = this.$markup();

  // Prepare structural markup.
  this.$element.html('<div class="commands"></div><div class="context"></div>');
  this.$commands = $(this.$element).find('.commands');
  this.$context = $(this.$element).find('.context');
  
  this.activeCommand = 0;
  this.commandList = new cs.commandList();
  
  this.newCommand();
};

cs.prototype = {
  
  // Return active markup for this field.
  $markup: function () {
    var $token = $('<div class="termkitCommandStream">').data('controller', this);
    var self = this;
    return $token;
  },

  // Refresh the given stream by re-inserting all command elements.
  updateElement: function () {
    // Refresh commands.
    var $commands = this.$commands.empty();
    $.each(this.commandList.commands, function () {
      $commands.append(this.$element);
    });
    
    // Refresh context bar.
    var command = this.commandList.commands[this.activeCommand];
    if (command && command.context) {
      this.$context.empty().append(command.context.$element);
    }
  },
  
  newCommand: function () {
    this.commandList.add(new cs.command());
    this.activeCommand = this.commandList.length - 1;
    this.updateElement();
  },
  
  // Respond to mouse clicks.
  //foo: function (event) {
  //},

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
