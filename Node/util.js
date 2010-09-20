// Process shortcut return values
exports.returnObject = function (out) {
  if (out.constructor === [].constructor) {
    out = { status: !out[0] ? 'ok' : 'error', code: out[0], data: out[1] };
  }
  else if (out === false || out === null || out === undefined) {
    out = { status: 'ok', code: 0 };
  }
  else if (out === true) {
    out = { status: 'error', code: 1 };
  }
  else if (typeof out == 'number') {
    out = { status: !out ? 'ok' : 'error', code: out };
  }
  
  return out;
};
