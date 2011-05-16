(function ($) {

var files = {
    'shBrushAppleScript.js':['applescript'],
    'shBrushAS3.js':        ['actionscript3','as3'],
    'shBrushBash.js':       ['bash','shell'],
    'shBrushColdFusion.js': ['coldfusion','cf'],
    'shBrushCpp.js':        ['cpp','c'],
    'shBrushCSharp.js':     ['c#','c-sharp','csharp'],
    'shBrushCss.js':        ['css'],
    'shBrushDelphi.js':     ['delphi','pascal'],
    'shBrushDiff.js':       ['diff','patch','pas'],
    'shBrushErlang.js':     ['erl','erlang'],
    'shBrushGroovy.js':     ['groovy'],
    'shBrushJava.js':       ['java'],
    'shBrushJavaFX.js':     ['jfx','javafx'],
    'shBrushJScript.js':    ['js','jscript','javascript'],
    'shBrushPerl.js':       ['perl','pl'],
    'shBrushPhp.js':        ['php'],
    'shBrushPlain.js':      ['text','plain'],
    'shBrushPython.js':     ['py','python'],
    'shBrushRuby.js':       ['ruby','rails','ror','rb'],
    'shBrushSass.js':       ['sass','scss'],
    'shBrushScala.js':      ['scala'],
    'shBrushSql.js':        ['sql'],
    'shBrushVb.js':         ['vb','vbnet'],
    'shBrushXml.js':        ['xml','xhtml','xslt','html'],
  },
  scripts = {},
  urls = {};
  
for (i in files) {
  for (j in files[i]) {
    urls[files[i][j]] = url(i);
  }
}
  
function url(file) {
  return 'external/syntaxhighlighter_3.0.83/scripts/' + file;
}

function loadScript(url, callback) {

  if (scripts[url]) {
    return callback();
  }
  
	var script = document.createElement('script'),
		  done = false;

	script.type = 'text/javascript';
	script.language = 'javascript';
	script.onload = script.onreadystatechange = function () {
		if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
			done = true;
			scripts[url] = true;
			
			// Handle memory leak in IE
			script.onload = script.onreadystatechange = null;
			script.parentNode.removeChild(script);
			
      delete SyntaxHighlighter.vars.discoveredBrushes;
			callback();
		}
	};
	script.src = url;
	
	// sync way of adding script tags to the page
	document.body.appendChild(script);
};

/**
 * Override highlighter to first load language-specific script.
 */
var h = SyntaxHighlighter.highlight;
SyntaxHighlighter.highlight = function (p, e) {
  var m, that = this;
  if (m = /brush: ([a-z]+)/(e.getAttribute('class'))) {
    if (urls[m[1]]) {
      loadScript(urls[m[1]], function () {
        h.call(that, p, e);
      });
    }
  }
};

})(jQuery);
