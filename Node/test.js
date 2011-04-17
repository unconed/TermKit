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

// Run tests.
var tests = [
//  testHandshake,
//  testSession,
  testCommands,
]
for (i in tests) tests[i]();
