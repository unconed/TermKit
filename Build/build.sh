#!/bin/bash
rm -rf TermKit.*
cp -R ../Cocoa/TermKit/Build/Release/TermKit.app .
zip -r TermKit.zip TermKit.app
