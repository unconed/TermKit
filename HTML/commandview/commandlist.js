(function ($) {

var cv = termkit.commandView;

/**
 * Manages the list of executed commands.
 */
cv.commandList = function () {
  this.commands = [];
};

cv.commandList.prototype = {
  // Pass-through length of array
  get length() {
    return this.commands.length;
  },
  
  // Simple debug output.
  debug: function () {
    $('#debug').empty();
    $.each(this.commands, function (index) {
      $('#debug').append('<div>'+ index +': '+ this);
    });
  },

  // Add a new command at the given index (optional).
  add: function (command, index) {
    command.commandList = this;

    if (arguments.length < 2 || index == -1) {
      this.commands.push(command);
    }
    else {
      this.commands.splice(index, 0, command);
    }
  },

  // Remove the given command.
  remove: function (command) {
    var index = this.indexOf(command);
    if (index < 0) return;
    this.commands.splice(index, 1);
  
    command.commandList = null;
  },

  // Replace the given command with the replacement command(s).
  replace: function (command, commands) {
    var index = this.indexOf(command), self = this;
    this.remove(index);
    // Allow both single command and array.
    $.each($.isArray(commands) && commands || [commands], function () {
      self.add(this, index++);
    });
  },

  // Find index of given command in list.
  indexOf: function (command) {
    return (typeof command == 'number') ? command : $.inArray(command, this.commands);
  },

  // Next iterator.
  next: function (command) {
    return this.commands[this.indexOf(command) + 1];
  },

  // Previous iterator.
  prev: function (command) {
    return this.commands[this.indexOf(command) - 1];
  },

};

})(jQuery);