# TermKit

![TermKit Icon](https://github.com/unconed/TermKit/raw/master/Illustrator/TermKit%20Icon%20128.png)

### Goal: next gen terminal / command application

Addresses following problems:

1. Monospace character grid with ansi colors is not rich enough to display modern files / media / visualizations / metadata. Cannot effectively handle large output, long/wide tables or direct interaction.
1. Piping binary or text streams between apps is bad for everyone:
 * Humans have to suffer syntax, cannot reflow/manipulate output in real-time
 * Computers have to suffer ambiguities
1. Synchronous input/output makes you wait. SSH keystroke latency is frustrating.
1. String-based command line requires arcane syntax, results in mistakes, repeated attempts at escaping, etc.
1. Unix commands are "useless by default", and when asked, will only tell you raw data, not useful facts. e.g. "rwxr-xr-x" instead of "You can't edit this file."

![TermKit 0.3 alpha](https://github.com/unconed/TermKit/raw/master/Mockups/Shot-0.3.png)

### Warning: Alpha version. Nothing works.


## How to use:

1. Install node.js and npm.
1. Run "npm install mime".
1. Run NodeKit daemon:

    cd Node
    node nodekit.js

1. Open the Cocoa app in Build/

*Tip:* Press Command-Option-C to access the WebKit console.

Includes “NSImage+QuickLook” code by Matt Gemmell (http://mattgemmell.com/source).
