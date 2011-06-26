var termkit = window.termkit || {};

(function ($) {
  
///////////////////////////////////////////////////////////////////////////////
  
$(document).ready(function () {

  var client = new termkit.client();
  client.onConnect = function () {
    var shell = new termkit.client.shell(client, {}, function (shell) {
      var view = new termkit.commandView(shell);
      $('#terminal').append(view.$element);
      view.newCommand();
    });    
  };
  
  $(document).mousedown(function () {
    alert('wtf');
  });
});

})(jQuery);

///////////////////////////////////////////////////////////////////////////////

function asyncCallback(func) {
  return function () { 
    var that = this;
    var args = arguments;
    setTimeout(function () { func.apply(that, args); }, 0);
  };
}

function async(func) {
  var that = this;
  setTimeout(function () { func.call(that); }, 0);
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
  return (typeof object == 'object' && object.constructor == [].constructor) ? object : [ object ];
}

///////////////////////////////////////////////////////////////////////////////

function formatSize(bytes) {
  var suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
  var limit = 1, cap = 1;
  for (i in suffixes) {
    limit *= 1000;
    if (bytes > limit) {
      cap = limit;
    }
    else {
      return Math.round(bytes / cap * 10) / 10 + ' ' + suffixes[i];
    }
  }
}
