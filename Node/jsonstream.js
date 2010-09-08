(function ($) {

/**
 * JSONStream protocol wrapper.
 */
var js = termkit.jsonStream = function (input, output) {
  this.id = 0;
  this.input = new js.jsonReader(input);
  this.output = new js.jsonWriter(output);
  this.
};

js.prototype = {
  send: function (type, dataCallback, successCallback, errorCallback) {
    var message = {
      type: type,
      id: this.id++,
    };
    // todo: output
    // todo: callback handling
  },
};

js.jsonReader = function (input, callback) {
  this.input = input;
  this.callback = callback;
  this.buffer = '';
  this.phase = 0;
  this.parseJSON = ($ && $.parseJSON);
  
  var self = this;
  this.input.addListener("output", function (data) { self.data(data); });
};

js.jsonReader.prototype = {
  
  data: function (data) {
    this.buffer += data;
    var callback = [this.handshake, this.stream][this.phase];
    callback && callback.call(this);
  },
  
  handshake: function () {
    var match;
    if (match = this.buffer.match(/^\s*{\s*"version"\s*:\s*(\d+)\s*,\s*"data"\s*:\s*\[\s*/)) {
      var version = parseInt(match[1], 10);
      if (version <= 1) {
        this.phase = 1;
        this.buffer = ',' + this.buffer.substring(match[0].length);
      }
      else {
        this.phase = 2;
      }
    }
  },
  
  stream: function () {
    if (this.buffer.match(/^\s*]\s*}/)) {
      this.phase = 2;
    }
    else {
      // Lazy progressive json parser. Should really be token/event-based, but oh well.
      var chunks = this.buffer.split(/,|]\s*}\s*$/), snip = 0;
      if (chunks[0].match(/^\s*$/)) {
        snip = chunks[0].length + 1;
        chunks.shift();
      }
      var test = '', object;
      for (i in chunks) {
        test += (test.length ? ',' : '') + chunks[i];
        try {
          var object = this.parseJSON(test);
          this.buffer = this.buffer.substring(test.length + snip);
          this.callback(object);
          break;
        }
        catch (e) { };
      }
    }
  },
  
};


/*
s.send('message', function (data) {
  
}, function success() {
  
}, function error() {
  
});
*/

})(jQuery);