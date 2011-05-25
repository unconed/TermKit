(function ($) {

/**
 * Controller for command view.
 */
var cv = termkit.commandView = function (shell) {
  var that = this;

  this.shell = shell;
  this.shell.commandView = this;

  this.$element = this.$markup();

  // Find structural markup.
  this.$commands = this.$element.find('.commands');
  this.$context = this.$element.find('.context');
  
  this.activeIndex = 0;
  this.beginIndex = 0;
  this.endIndex = 0;

  this.commandList = new termkit.container();  
  
  $(window).resize(function () { that.resize(); });
};

cv.prototype = {
  
  // Return active markup for this widget.
  $markup: function () {
    var $commandView = $('<div class="termkitCommandView"><div class="commands"></div><div class="context"></div>').data('controller', this);
    var that = this;
    return $commandView;
  },

  // Update the element's markup in response to internal changes.
  updateElement: function () {
    if (this.endIndex < this.commandList.length) {
      for (; this.endIndex < this.commandList.length; ++this.endIndex) {
        var command = this.commandList.collection[this.endIndex];
        this.$commands.append(command.$element);
      }
    }
    
    // Refresh context bar.
    var command = this.activeCommand();
    if (command && command.context) {
      this.$context.empty().append(command.context.$element);
    }

    this.resize();
  },
  
  clear: function () {
    var contents = this.commandList.contents;

    var i = 0, j = 0, n = this.commandList.length, that = this;
    for (; j < n; ++i, ++j) (function (command) {
      if (command.state != 'running') {
        command.$element.remove();
        that.commandList.remove(i);
        i--;
      }
    })(contents[j]);
  },
  
  resize: function () {
    // Measure view.
    var height = $('body').height() - this.$context[0].offsetHeight - (22 + 13) * 2 - 5;
    $('#dynamic-styles').html('.termkitCommandView .termkitLimitHeight { max-height: ' + height + 'px; }');
  },
  
  activeCommand: function () {
    return this.commandList.collection[this.activeIndex];
  },
  
  newCommand: function () {
    var command = new cv.command(this, new cv.commandContext(this.shell));
    this.commandList.add(command);
    this.activeIndex = this.commandList.length - 1;
    this.updateElement();
    command.tokenField.focus();
  },
  
  // Respond to mouse clicks.
  //foo: function (event) {
  //},

};

})(jQuery);
