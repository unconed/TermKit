TermKit

Goal: next gen terminal / command application

Addresses following problems:
1) Monospace character grid with ansi colors is not rich enough to display modern files / media / visualizations / metadata. Cannot effectively handle large output, long/wide tables or direct interaction.
2) Piping binary or text streams between apps is bad for everyone:
   * Humans have to suffer syntax, cannot reflow/manipulate output in real-time
   * Computers have to suffer ambiguities
3) Synchronous input/output makes you wait. SSH keystroke latency is frustrating.
4) String-based command line requires arcane syntax, results in mistakes, repeated attempts at escaping, etc.
5) Unix commands are "useless by default", and when asked, will only tell you raw data, not useful facts. e.g. "rwxr-xr-x" instead of "You can't edit this file."


Warning: Alpha version. Nothing works.


How to use:

1) Run NodeKit daemon:

 cd Node
 node nodekit.js

2) Open HTML/index.html in a WebKit browser.



Includes “NSImage+QuickLook” code by Matt Gemmell (http://mattgemmell.com/source).
