//
//  TermKitAppDelegate.m
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "TermKitAppDelegate.h"
#import "TermKitWindowController.h"

@implementation TermKitAppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    [self newWindow:self];
}

- (IBAction) newWindow: sender {
    id windowController = [[TermKitWindowController alloc] init]; 
    [windowController showWindow:self];
}

@end
