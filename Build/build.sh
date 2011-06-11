#!/bin/bash
rm -rf TermKit.*
cp -R ../Cocoa/TermKit/build/Release/TermKit.app .
zip -r TermKit.zip TermKit.app
