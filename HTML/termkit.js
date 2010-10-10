var termkit = {};

(function ($) {
  
///////////////////////////////////////////////////////////////////////////////
  
$(document).ready(function () {

  var client = new termkit.client();
  client.onConnect = function () {
    var shell = new termkit.client.shell(client, {}, function () {
      var view = new termkit.commandView(shell);
      $('#terminal').append(view.$element);
      view.newCommand();
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

function oneOrMany(object) {
  return (object.constructor == [].constructor) ? object : [ object ];
}
