# TermKit

![TermKit Icon](https://github.com/unconed/TermKit/raw/master/Illustrator/TermKit%20Icon%20128.png)

### Goal: next gen terminal / command application

Addresses following problems:

1. Monospace character grid with ansi colors is not rich enough to display modern files / media / visualizations / metadata. Cannot effectively handle large output, long/wide tables or direct interaction.
1. Relying on anonymous pipes to transfer data around is error-prone
 * Human-friendly text results in ambiguities
 * Need to match formats at pipe ends
 * Confusion between data output and notification output
1. Synchronous input/output makes you wait. SSH keystroke latency is frustrating.
1. String-based command line requires arcane syntax, results in mistakes, repeated attempts at escaping, etc.
1. Unix commands are "useless by default", and when asked, will only tell you raw data, not useful facts. e.g. "rwxr-xr-x" instead of "You can't edit this file."

![TermKit 0.3 alpha](https://github.com/unconed/TermKit/raw/master/Mockups/Shot-0.3.png)

### Warning: Alpha version. Nothing works.

Some highlights:

* Smart token-based input with inline autocomplete
* Rich output for common tasks and formats, using MIME types + sniffing
* Asynchronous views for background / parallel tasks
* Full separation between front/back-end

## How to use:

1. Install node.js and npm.
1. Run "npm install mime".
1. Run NodeKit daemon:

```
cd Node
node nodekit.js
```

4. Open the Cocoa app in Build/

*Tip:* Press ⌥⌘C to access the WebKit console.

Includes “NSImage+QuickLook” code by Matt Gemmell (http://mattgemmell.com/source).
