// Really shitty tests for back-end.
// Need to replace timeouts with actual query/answer logic.

var termkit = {
  version: 1,
  test: true,
};
require.paths.unshift('./socket.io-node/lib');
require.paths.unshift('.');
require.paths.unshift('../Shared/');

var whenDone = require('misc').whenDone;
var EventEmitter = require("events").EventEmitter;

var router = require("router");
var processor = require("shell/processor");
var meta = require("shell/meta");
var autocomplete = require("shell/autocomplete");

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
    messages.push(JSON.parse(message));
  };

  client.disconnect = function (message) {
    success = false;
  };

  var r = new router.router(client);
  for (i in flow) (function (message) {
    setTimeout(function () {
      client.emit('message', JSON.stringify(message));
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
  }), i * 100 + 500);
}

/**
 * Test termkit handshake.
 */
function testHandshake() {
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
function testSession() {

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
    assert(messages[3].success && messages[3].args.cwd &&
           messages[4].success && messages[4].args.cwd, "Environment is set x2");
    assert(messages[5].success && messages[6].success, "Close shell session x2");
  });

}

/**
 * Test command handling.
 */
function testCommands() {
  mockShell([
//    { query: 5, method: 'shell.run', args: { tokens: [ 'pwd' ], ref: 7 } },
    { query: 5, method: 'shell.run', args: { tokens: [ 'cat', 'test.js' ], ref: 4 } },
  ], function (messages, success) {
    for (i in messages) { 
      console.log(messages[i]);
      messages[i].args && messages[i].args.objects && console.log('Objects', messages[i].args.objects);
    }
    var last = messages[messages.length - 1];
    assert(last.success && last.answer == 5, "Run single command");
  });
}

/**
 * Test mime-type handling.
 */
function testMeta() {
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
}

/**
 * Test autocompletion handler.
 */
function testAutocomplete() {
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
    assert(m && m.length == 2 &&
           m[0].label == 'cat' && m[0].type == 'command' &&
           m[1].label == 'cd'  && m[1].type == 'command', "Autocomplete c command");
  });

  auto.process(process.cwd(), [], [ 'cat', 'test.j' ], 1, function (m) {
    assert(m && m.length == 1 &&
           m[0].label == 'test.js' && m[0].type == 'file', "Autocomplete test.j filename");
  });

}

// Run tests.
var tests = [
    testHandshake,
    testSession,
    testCommands,
    testMeta,
    testAutocomplete,
]
for (i in tests) tests[i]();

(track(function () {}))();