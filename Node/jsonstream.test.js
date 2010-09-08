// todo: convert into real test

var chunkySource = {
  addListener: function (x, callback) {
    if (!this.readers) this.readers = [];
    this.readers.push(callback);
  },
  
  data: function (json) {
    while (json.length > 0) {
      var chunk = json.substring(0, Math.round(Math.random() * json.length));
      json = json.substring(chunk.length);
      
      for (i in this.readers) this.readers[i](chunk);
    };
  },
}

var reader = new termkit.jsonStream.jsonReader(chunkySource, function (data) { console.log(data); });
chunkySource.data('{ "version": 1, "data": [ ["test", 1, { "foo": "bar" } ], ["test", 1, { "foo": "bar" } ], ["test", 1, { "foo": "bar" } ] ] }');