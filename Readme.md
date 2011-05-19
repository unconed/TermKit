# TermKit

![TermKit Icon](https://github.com/unconed/TermKit/raw/master/Illustrator/TermKit%20Icon%20128.png)

### Goal: next gen terminal / command application

Built out of WebKit and Node.js.

Runs in a Mac/Cocoa app, and can be hacked into any WebKit browser (Chrome, Safari).

For the background and architecture, please read and comment on:
http://acko.net/blog/on-termkit

![TermKit 0.3 alpha](https://github.com/unconed/TermKit/raw/master/Mockups/Shot-0.3.png)
![TermKit 0.3 alpha](https://github.com/unconed/TermKit/raw/master/Mockups/Shot-Self-Commit.png)
![TermKit 0.3 alpha](https://github.com/unconed/TermKit/raw/master/Mockups/Shot-Highlight.png)

### Warning: Alpha version, still under development. Nothing works yet.

## Some cool features

* Smart token-based input with inline autocomplete and automatic escaping
* Rich output for common tasks and formats, using MIME types + sniffing
* Asynchronous views for background / parallel tasks
* Full separation between front/back-end

## TermKit is not a...
* ...Web application. It runs as a regular desktop app.
* ...Scripting language like PowerShell or bash. It focuses on executing commands only.
* ...Full terminal emulator. It does not aim to e.g. host 'vim'.
* ...Reimplementation of the Unix toolchain. It replaces and/or enhances built-in commands and wraps external tools.

(but you could make it do most of those things with plug-ins)

## How to use:

Unfortunately, TermKit currently requires some assembly.

1. Install the Mac development tools (Xcode and friends).
2. [Install node.js](https://github.com/joyent/node/wiki/Installation).
3. If not covered in #2, install npm: `curl http://npmjs.org/install.sh | sh`
4. Install node-mime: `npm install mime`
5. Clone the TermKit repository: `git clone git@github.com:unconed/TermKit.git --recursive`
6. Users of older git versions will need to type: `git submodule update --init`
7. Run the NodeKit daemon: `cd TermKit/Node; node nodekit.js`
8. Unzip and run the Mac app in Build/TermKit.zip

*Tip:* Press ⌥⌘C to access the WebKit console.

Includes:

* “NSImage+QuickLook” by Matt Gemmell (http://mattgemmell.com/source).
* SyntaxHighlighter by Alex Gorbatchev (http://alexgorbatchev.com/SyntaxHighlighter/)
* jQuery and jQuery UI