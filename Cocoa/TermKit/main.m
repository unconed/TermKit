//
//  main.m
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>

int main(int argc, char *argv[])
{
    [NSApplication sharedApplication];
    [NSBundle loadNibNamed:@"MainMenu" owner:NSApp];
    [NSApp run];
    return -1;
}
