var termkit = {};

(function ($) {
  
///////////////////////////////////////////////////////////////////////////////
  
$(document).ready(function () {

  function mark(object, id) {
    $.each(object, function (index) {
      if ($.isFunction(this)) {
        var old = object[index];
        object[index] = function () {
          async($('#debug').append('<div>'+ id +'.' + index +' - ' +' '+ arguments));
          return old.apply(this, arguments);
        };
      }
    });
  }

//  mark(termkit.tokenField.token, 'tokenField.token');
//  mark(termkit.tokenField.token.prototype, 'tokenField.token');

  var client = new termkit.client();
  client.onConnect = function () {
    client.invoke('session.open.shell', {}, function (environment) {
      var shell = new termkit.client.shell(client, environment);
      var view = new termkit.commandView(shell);
      $('#terminal').append(view.$element);

      view.newCommand();

      console.log(environment);
    });

  };


});

})(jQuery);

///////////////////////////////////////////////////////////////////////////////

function async_callback(func) {
  return function () { 
    var self = this;
    var args = arguments;
    setTimeout(function () { func.apply(self, args); }, 0);
  };
}

function async(func) {
  var self = this;
  setTimeout(function () { func.call(self); }, 0);
}

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bug(object, type) {
  $.each(object, function (index) {
    if ($.isFunction(this)) {
      var original = this;
      object[index] = function () {
        console.log(type +'.'+ index);
        console.log(arguments);
        original.apply(this, arguments);
      };
    }
  });
}

