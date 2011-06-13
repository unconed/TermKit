// Really shitty tests for back-end.
// Need to replace timeouts with actual query/answer logic.

var termkit = {
  version: 1,
  test: true,
};
require.paths.unshift('./socket.io-node/lib');
require.paths.unshift('.');
require.paths.unshift('shell');
require.paths.unshift('../Shared/');

var whenDone = require('misc').whenDone;
var EventEmitter = require("events").EventEmitter;

var router = require("router");
var processor = require("shell/processor");
var meta = require("shell/meta");
var reader = require("shell/reader");
var autocomplete = require("shell/autocomplete");
var misc = require("misc");
var grep = require("shell/builtin/grep");

var asserts = [];
function assert(condition, message) {
  asserts.push([ !!condition, message, ]);
}
var track = whenDone(function () {
  var total = 0, failed = 0;
  for (i in asserts) (function (assert) {
    !assert[0] && failed++;
    total++;
    console.log(assert[0] ? '[X]' : '[ ]', '', assert[1]);
  })(asserts[i]);
  console.log(total + " tests, " + failed + " failed.");
});

/**
 * Helper: simulate a client connection on the router.
 */
function mockClient(flow, callback) {
  var client = new EventEmitter();
  var messages = [], success = true, i;

  client.send = function (message) {
    messages.push(message);
  };

  client.disconnect = function (message) {
    success = false;
  };

  var r = new router.router(client);
  for (i in flow) (function (message) {
    setTimeout(function () {
      client.emit('message', message);
    }, i * 100);
  })(flow[i]);
  
  setTimeout(track(function () {
    callback(messages, success);
    r.disconnect();
  }), i * 100 + 500);
}

/**
 * Helper: run worker commands on a shell.
 */
function mockShell(flow, callback) {
  var messages = [], success = true, i = 0;

  var stdin = new EventEmitter(),
      stdout = new EventEmitter();

  stdout.write = function (data) {
    messages.push(JSON.parse(data.substring(0, data.length - 1)));
  };

  var p = new processor.processor(stdin, stdout);
  for (i in flow) (function (message) {
    setTimeout(function () {
      stdin.emit('data', JSON.stringify(message) + '\u0000');
    }, i * 100);
  })(flow[i]);

  setTimeout(track(function () {
    callback(messages, success);
    stdin.emit('end');
  }), i * 100 + 1000);
}

/**
 * Test termkit handshake.
 */
function testHandshake(assert) {
  mockClient([
    {},
  ], function (messages, success) {
    assert(messages.length == 1 && messages[0].termkit == "1" && true, "TermKit handshake found.");
  });

  mockClient([
    { termkit: ".", },
  ], function (messages, success) {
    assert(!success, "Invalid version string is rejected.");
  });

  mockClient([
    { termkit: "1", },
  ], function (messages, success) {
    assert(success, "Valid version string is accepted.");
  });
}

/**
 * Test session/shell handling.
 */
function testSession(assert) {

  mockClient([
    { termkit: "1" },
    { query: 1, method: "session.open.shell" },
    { query: 2, method: "session.open.shell" },
    { query: 3, method: "shell.environment", session: 1, args: { } },
    { query: 4, method: "shell.environment", session: 2, args: { } },
    { query: 5, method: "session.close", session: 1 },
    { query: 6, method: "session.close", session: 2 },
  ], function (messages, success) {
    console.log(messages);
    assert(messages[1].success && messages[1].args.session == 1 &&
           messages[2].success && messages[2].args.session == 2, "Open shell session x2");
    assert(messages[3].success && messages[3].args && messages[3].args.cwd &&
           messages[4].success && messages[4].args && messages[4].args.cwd, "Environment is set x2");
    assert(messages[5].success && messages[6].success, "Close shell session x2");
  });

}

/**
 * Test command handling.
 */
function testCommands(assert) {
  mockShell([
//    { query: 5, method: 'shell.run', args: { tokens: [ 'pwd' ], ref: 7 } },
    { query: 5, method: 'shell.run', args: { tokens: [ 'cat', 'test.js' ], ref: 4 } },
  ], function (messages, success) {
    /*
    for (i in messages) { 
      console.log(messages[i]);
      messages[i].args && messages[i].args.objects && console.log('Objects', messages[i].args.objects);
    }
    */
    var last = messages[messages.length - 1];
    assert(last.success && last.answer == 5, "Run single command");
  });
}

/**
 * Test mime-type handling.
 */
function testMeta(assert) {
  var headers, set, string;
  
  // Test basic getters and setters.
  headers = new meta.headers();
  
  headers.set('Content-Type', 'text/plain');
  assert(headers.get('Content-Type') == 'text/plain', 'Value getter/setter');

  headers.set('Content-Type', 'charset', 'utf-8');
  assert(headers.get('Content-Type', 'charset') == 'utf-8', 'Param getter/setter');

  headers.set('Content-Type', [ 'text/html', { 'charset': 'iso-8859-1' } ]);
  assert(headers.get('Content-Type') == 'text/html' &&
         headers.get('Content-Type', 'charset') == 'iso-8859-1', 'Combined getter/setter');
  
  // Test multiple value getters/setters.
  headers.set('Accept-Encoding', [ 'compress', 'gzip' ]);

  set = headers.get('Accept-Encoding');
  assert(set.length == 2 &&
         set[0] == 'compress' &&
         set[1] == 'gzip',
         'Multi-value getter/setter');

  headers.set('Accept', [
    [ 'text/html', { 'q': 1 } ],
    [ 'text/css' ],
    [ 'text/plain', { 'q': 0.8 } ],
  ] );
  set = headers.get('Accept');
  assert(set.length == 3 &&
         set[0] == 'text/html' &&
         set[1] == 'text/css' &&
         set[2] == 'text/plain',
         'Multi-value getter/setter combined');

  set = headers.get('Accept', 'q');
  assert(set.length == 3 &&
         set[0] == 1 &&
         typeof set[1] == 'undefined' &&
         set[2] == 0.8,
         'Multi-param getter/setter combined');

  // Test parsing rules of RFC 822 values.
  headers = new meta.headers();
  assert(headers.parseValue('"application/javascript"') == 'application/javascript',
         "Parse quoted value");

  assert(headers.parseValue('"app\\"li\\\\cati\\on\\/javascript"') == 'app"li\\cation/javascript',
         "Parse quoted value with escapes");

  set = headers.parseValue('max-age=0', true);
  assert(set[0] == null && typeof set[1] == 'object' && set[1]['max-age'] == '0',
        "Parse param");

  set = headers.parseValue('application/javascript;charset=utf-8', true);
  assert(set[0] == 'application/javascript' && typeof set[1] == 'object' && set[1].charset == 'utf-8',
         "Parse value + param");

  set = headers.parseValue('application/javascript; charset="utf-8"', true);
  assert(set[0] == 'application/javascript' && typeof set[1] == 'object' && set[1].charset == 'utf-8',
         "Parse value + quoted param");

  string = 'Mozilla/5.0 (Macintosh; U; (Intel Mac OS X 10_6_7); en-ca) AppleWebKit/533.20.25 (KHTML, like Gecko) Version/5.0.4 Safari/533.20.27';
  set = headers.parseValue(string, true);
  assert(headers.parseValue(string) == string, "Pass-through comments safely");
         
  // Parse entire set of headers at once.
  headers.parse([
    'Content-Type: text/plain;\r\n charset="utf-16"',
    'Content-Disposition: attachment; filename=genome.jpeg;\r\n modification-date="Wed, 12 February 1997 16:29:51 -0500";',
    'Foo: bar',
    'Accept: application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
    'X-Unknown: this "value does not follow, (mime syntax',
  ].join("\r\n"));
  assert(headers.get('Content-Type') == 'text/plain', 'Parse folded line');
  assert(headers.get('Content-Type', 'charset') == 'utf-16', 'Parse folded line');
  assert(headers.get('Content-Disposition') == 'attachment', 'Mixed parameters');
  assert(headers.get('Content-Disposition', 'filename') == 'genome.jpeg', 'Mixed parameters');
  assert(headers.get('Content-Disposition', 'modification-date') == 'Wed, 12 February 1997 16:29:51 -0500', 'Mixed parameters');
  assert(headers.get('Foo') == 'bar', 'Basic property');
  assert(headers.get('X-Unknown') == 'this "value does not follow, (mime syntax', 'Unparseable property');
  set = headers.get('Accept');
  assert(set.length == 6 && set[0] == 'application/xml' && set[5] == '*/*', 'Identical properties');
  set = headers.get('Accept', 'q');
  assert(set.length == 6 && typeof set[1] == 'undefined' && set[2] == '0.9' && set[3] == '0.8' && set[5] == '0.5', 'Identical property parameters');
  
  // Generate headers back.
  var string = headers.generate();
  assert(/\r\n\r\n$/(string), 'Headers end in CRLF x2');
  assert(string.split(/\r\n/).length == 5 + 2, '5 Headers returned');
  assert(/^Content-Type:\s*text\/plain;\s*charset=utf-16\r\n/m, 'Content-Type correct');
  assert(/^Content-Disposition:\s*attachment;\s*filename=genome.jpeg;\s*modification-date="Wed, 12 February 1997 16:29:51 -0500"\r\n/m, 'Content-Disposition correct');
  assert(/^Foo: bar\r\n/m, 'Foo correct');
  assert(/^Accept: application\/xml,application\/xhtml\+xml,text\/html;q=0.9,text\/plain;q=0.8,image\/png,\*\/\*;q=0.5\r\n/m, 'Accept correct');
  assert(/^X-Unknown: "this \"value does not follow, \(mime syntax"\r\n/m, 'X-Unknown correct');

  // Test raw set from mime-like source.
  headers = new meta.headers();
  
  headers.set('Content-Type', 'text/plain; charset=utf-8', null, true);
  console.log(headers.fields);
  console.log(headers.params);
  assert(headers.get('Content-Type') == 'text/plain', 'Raw getter/setter');
  assert(headers.get('Content-Type', 'charset') == 'utf-8', 'Raw param getter/setter');
}

/**
 * Test autocompletion handler.
 */
function testAutocomplete(assert) {
  var auto = new autocomplete.autocomplete(), c;

  mockShell([
    { query: 7, method: 'shell.autocomplete', args: { tokens: [ 'c' ], offset: 0 } },
  ], function (messages, success) {
    /*
    var i, j;
    for (i in messages) { 
      for (j in messages[i].args.matches) {
        console.log(messages[i].args.matches[j]);
      }
    }
    */
    var last = messages[messages.length - 1];
    assert(last && last.success && last.answer == 7, "Autocomplete c command");
  });
  
  auto.process(process.cwd(), [], [ 'c' ], 0, function (m) {
    assert(m && m.length == 3 &&
           m[0].label == 'cat'    && m[0].type == 'command' &&
           m[1].label == 'cd'     && m[1].type == 'command' &&
           m[2].label == 'clear'  && m[2].type == 'command', "Autocomplete c command");
  });

  auto.process(process.cwd(), [], [ 'cat', 'test.j' ], 1, function (m) {
    assert(m && m.length == 1 &&
           m[0].label == 'test.js' && m[0].type == 'file', "Autocomplete test.j filename");
  });

}

/**
 * Test misc utilties.
 */
function testMisc(assert) {
  assert(misc.JSONPretty({}) == '{ \n} ', 'Pretty print {}');
  assert(misc.JSONPretty([]) == '[ \n] ', 'Pretty print []');

  assert(misc.JSONPretty({'foo':'bar', 'baz':'bam'})
         == '{ \n  "foo": "bar", \n  "baz": "bam"\n} ',
         'Pretty print object');

  assert(misc.JSONPretty({foo: {baz:'bam'}, faz: {baz:'bam'}})
         == '{ \n  "foo": { \n    "baz": "bam"\n  } , \n  "faz": { \n    "baz": "bam"\n  }\n} ',
         'Pretty print nested objects');

  assert(misc.JSONPretty(['baz', {'foo':'bar'}, 12.3, 'aaa'])
         == '[ \n  "baz", \n  { \n    "foo": "bar"\n  } , \n  12.3, \n  "aaa"\n] ',
         'Pretty print array');
}

function mockPipes() {

  var fake    = new EventEmitter();
  fake.stdin  = new EventEmitter();
  fake.stdout = new EventEmitter();
  fake.stderr = new EventEmitter();

  // Helper for converting strings to buffers.
  function buffer(data) {
    if (data.constructor != Buffer) {
      data = new Buffer(data, 'utf8');
    }
    return data;
  }

  // Set up fake stdin.
  fake.stdin.write = function (data) {
    fake.stdin.emit('data', buffer(data));
  };
  fake.stdin.end = function () {
  };

  // Set up fake stdout.
  fake.stdout.write = function (data) {
//    console.log('stdout.write', data.toString('utf-8'));
    fake.stdout.emit('data', buffer(data));
  };
  fake.stdout.end = function () {
  };

  // Set up fake stderr.
  fake.stderr.write = function (data) {
    fake.stderr.emit('data', buffer(data));
  };
  fake.stderr.end = function () {
  };

  return {
    dataIn: fake.stdin,
    dataOut: fake.stdout,
    errorOut: fake.stderr,
    viewIn: new EventEmitter(),
    viewOut: function (message, args) {
    //  console.log('viewOut', message, args);
    },
  };
};

/**
 * Test argument parsing.
 */
function testParseArgs(assert) {
  
  var args = misc.parseArgs([ 'grep', '-v', 'foo bar', '--magic', '7', '--a', '--b' ]);
  assert(args.values.length == 1 && args.values[0] == 'foo bar', "Argument values");
  assert(args.options.v && args.options.a && args.options.b && (args.options.magic == '7'),
         "Argument options");

   var args = misc.parseArgs([ 'grep', '-vab', 'foo bar', '--magic', '7' ]);
   assert(args.values.length == 1 && args.values[0] == 'foo bar', "Argument values");
   assert(args.options.v && args.options.a && args.options.b && (args.options.magic == '7'),
          "Compact argument options");
  
}

/**
 * Test grep.js
 */
function testGrep(assert) {
  
  var handler = grep.main,
      exit = function () {},
      headers, content, pipes;

  // Helper for converting strings to buffers.
  function buffer(data) {
    if (data.constructor != Buffer) {
      data = new Buffer(data, 'utf8');
    }
    return data;
  }

  // Simple grep.
  pipes = mockPipes();
  handler([ 'grep', 'ba' ], pipes, exit);

  pipes.dataOut.on('data', function (data) {
    if (data.toString('utf-8').indexOf('\r\n\r\n') >= 0) return;
    var lines = data.toString('utf-8').split("\n");
    assert(lines.length == 3 && lines[0] == 'bar' &&
           lines[1] == 'baz' && lines[2] == 'ccbacc',
           "Grep plaintext lines");
  });
  
  headers = new meta.headers();
  content = "foo\nbar\nbaz\nbingo\nccbacc\n\n\nfffuuu\n";
  headers.set('Content-Type', 'text/plain');
  headers.set('Content-Length', content.length);
  pipes.dataIn.emit('data', buffer(headers.generate()));
  pipes.dataIn.emit('data', buffer(content));
  pipes.dataIn.emit('end');

  // Simple grep (negative).
  pipes = mockPipes();
  handler([ 'grep', '-v', 'ba' ], pipes, exit);

  pipes.dataOut.on('data', function (data) {
    if (data.toString('utf-8').indexOf('\r\n\r\n') >= 0) return;
    var lines = data.toString('utf-8').split("\n");
    assert(lines.length == 5 && lines[0] == 'foo' &&
           lines[1] == 'bingo' && lines[2] == '' && lines[3] == '' && lines[4] == 'fffuuu',
           "Grep plaintext lines (negative)");
  });
  
  headers = new meta.headers();
  content = "foo\nbar\nbaz\nbingo\nccbacc\n\n\nfffuuu\n";
  headers.set('Content-Type', 'text/plain');
  headers.set('Content-Length', content.length);
  pipes.dataIn.emit('data', buffer(headers.generate()));
  pipes.dataIn.emit('data', buffer(content));
  pipes.dataIn.emit('end');
  
  // JSON grep.
  pipes = mockPipes();
  handler([ 'grep', 'ba' ], pipes, exit);

  pipes.dataOut.on('data', function (data) {
    data = data.toString('utf-8');
    if (data.indexOf('\r\n\r\n') >= 0) return;
    assert(data == '{"foo":"bar","baz":"bang"}',
           "Grep JSON object");
  });
  
  headers = new meta.headers();
  content = '{"foo":"bar","baz":"bang","bingo":"fffuu"}';
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Length', content.length);
  pipes.dataIn.emit('data', buffer(headers.generate()));
  pipes.dataIn.emit('data', buffer(content));
  pipes.dataIn.emit('end');

  // JSON grep (negative).
  pipes = mockPipes();
  handler([ 'grep', '-v', 'ba' ], pipes, exit);

  pipes.dataOut.on('data', function (data) {
    data = data.toString('utf-8');
    if (data.indexOf('\r\n\r\n') >= 0) return;
    assert(data == '{"bingo":"fffuu"}',
           "Grep JSON object (negative)");
  });
  
  headers = new meta.headers();
  content = '{"foo":"bar","baz":"bang","bingo":"fffuu"}';
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Length', content.length);
  pipes.dataIn.emit('data', buffer(headers.generate()));
  pipes.dataIn.emit('data', buffer(content));
  pipes.dataIn.emit('end');

  // Complex JSON grep.
  pipes = mockPipes();
  handler([ 'grep', 'X' ], pipes, exit);

  pipes.dataOut.on('data', function (data) {
    data = data.toString('utf-8');
    if (data.indexOf('\r\n\r\n') >= 0) return;
    assert(data == '["xXx",{"foo":"XX","baz":"X"},["XX","XXX"]]',
           "Grep complex JSON array/object");
  });
  
  headers = new meta.headers();
  content = '[ "---", "xXx", { "foo": "XX", "bar": "YY", "baz": "X" }, { "meh": "no" }, [ 1, "XX", 3, "XXX" ]]';
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Length', content.length);
  pipes.dataIn.emit('data', buffer(headers.generate()));
  pipes.dataIn.emit('data', buffer(content));
  pipes.dataIn.emit('end');

  // Complex JSON key grep.
  pipes = mockPipes();
  handler([ 'grep', '-k', 'a' ], pipes, exit);

  pipes.dataOut.on('data', function (data) {
    data = data.toString('utf-8');
    if (data.indexOf('\r\n\r\n') >= 0) return;
    assert(data == '[{"bar":"YY","baz":"X"},{"mah":"no"}]',
           "Grep complex JSON array/object (keys)");
  });
  
  headers = new meta.headers();
  content = '[ "---", "xXx", { "foo": "XX", "bar": "YY", "baz": "X" }, { "mah": "no" }, [ {"foo":"bar"}, "XX", 3, "XXX" ]]';
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Length', content.length);
  pipes.dataIn.emit('data', buffer(headers.generate()));
  pipes.dataIn.emit('data', buffer(content));
  pipes.dataIn.emit('end');

  // Tricky object grep
  pipes = mockPipes();
  handler([ 'grep', 'lulz' ], pipes, exit);

  pipes.dataOut.on('data', function (data) {
    data = data.toString('utf-8');
    if (data.indexOf('\r\n\r\n') >= 0) return;
    assert(data == '{"list":[{"lol":"lulz"}]}',
           "Tricky object grep");
  });

  headers = new meta.headers();
  content = '{"foo": "bar", "meh": "teh", "lol": "wai", "list": [ { "lol": "lulz", "fail": "json" } , "wtf" ] }';
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Length', content.length);
  pipes.dataIn.emit('data', buffer(headers.generate()));
  pipes.dataIn.emit('data', buffer(content));
  pipes.dataIn.emit('end');
}

/**
 * Test command pipelines.
 */
function testPipe(assert) {

  mockShell([
    { query: 8, method: 'shell.run', args: { tokens: [ [ 'ls' ], [ 'grep', '.js' ] ], ref: 7 } },
  ], function (messages, success) {
    /*
    for (i in messages) { 
      console.log(messages[i]);
      messages[i].args && messages[i].args.objects && console.log('Objects', messages[i].args.objects);
    }
    */
    var last = messages[messages.length - 1];
    assert(last.success && last.answer == 8, "Run pipelined command");
  });
  
}

/**
 * Test binary handling.
 */
function testBinary(assert) {
  test = misc.escapeBinary("\u0000\u0001\u0002\u0003 xxx \r\n \u1fff \ufffd");
  assert(test == "\\u0000\\u0001\\u0002\\u0003 xxx \r\n \u1fff \ufffd", "Binary escaping");
}

/**
 * Test filereader.
 */
function testFilereader(assert) {

  var pipe;

  // Test type coercion.
  
  pipe = new reader.filesReader([ '../termkit.txt' ], function () {
    return { begin: function (headers) {
      assert(headers.get('Content-Type') == 'text/plain', 'Type for txt');
    } };
  });

  pipe = new reader.filesReader([ '../Mockups/Shot-0.2.png' ], function () {
    return { begin: function (headers) {
      assert(headers.get('Content-Type') == 'image/png', 'Type for img');
    } };
  });

  pipe = new reader.filesReader([ 'router.js' ], function () {
    return { begin: function (headers) {
      assert(headers.get('Content-Type') == 'application/javascript', 'Type for js');
    } };
  });

  pipe = new reader.filesReader([ 'test.js', 'router.js' ], function () {
    return { begin: function (headers) {
      assert(headers.get('Content-Type') == 'application/javascript', 'Type for (js+js)');
    } };
  });

  pipe = new reader.filesReader([ 'misc.js', 'router.js', 'config.js' ], function () {
    return { begin: function (headers) {
      assert(headers.get('Content-Type') == 'application/javascript', 'Type for (js+js+js)');
    } };
  });

  pipe = new reader.filesReader([ 'misc.js', '../termkit.txt' ], function () {
    return { begin: function (headers) {
      assert(headers.get('Content-Type') == 'text/plain', 'Type for (js+txt)');
    } };
  });

  pipe = new reader.filesReader([ 'misc.js', '../termkit.txt', '../Mockups/Shot-0.2.png' ], function () {
    return { begin: function (headers) {
      assert(headers.get('Content-Type') == 'application/octet-stream', 'Type for (js+txt+img)');
    } };
  });

}


// Run tests.
var tests = {
  handshake: testHandshake,
  session: testSession,
  commands: testCommands,
  autocomplete: testAutocomplete,
  meta: testMeta,
  misc: testMisc,
  parseArgs: testParseArgs,
  pipe: testPipe,
  grep: testGrep,
  binary: testBinary,
  filereader: testFilereader,
};
for (i in tests) (function (i, test) {
  test(function (c, msg) {
    assert(c, i +': '+ msg);
  });
})(i, tests[i]);

(track(function () {}))();