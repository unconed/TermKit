(function ($) {

/**
 * Controller for command view.
 */
var cv = termkit.commandView = function (shell) {
  var self = this;

  this.shell = shell;
  this.environment = shell.environment;
  this.context = new cv.commandContext(this.environment);

  this.$element = this.$markup();

  // Find structural markup.
  this.$commands = $(this.$element).find('.commands');
  this.$context = $(this.$element).find('.context');
  
  this.activeIndex = 0;
  this.commandList = new cv.commandList();
  
  this.newCommand();
};

cv.prototype = {
  
  // Return active markup for this widget.
  $markup: function () {
    var $commandView = $('<div class="termkitCommandView"><div class="commands"></div><div class="context"></div>').data('controller', this);
    var self = this;
    return $commandView;
  },

  // Refresh the given view by re-inserting all command elements.
  updateElement: function () {
    // Refresh commands.
    var $commands = this.$commands.empty();
    $.each(this.commandList.commands, function () {
      $commands.append(this.$element);
    });
    
    // Refresh context bar.
    var command = this.activeCommand();
    if (command && command.context) {
      this.$context.empty().append(command.context.$element);
    }
  },
  
  activeCommand: function () {
    return this.commandList.commands[this.activeIndex];
  },
  
  newCommand: function () {
    this.commandList.add(new cv.command(this.context));
    this.activeIndex = this.commandList.length - 1;
    this.updateElement();
  },
  
  // Respond to mouse clicks.
  //foo: function (event) {
  //},

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
