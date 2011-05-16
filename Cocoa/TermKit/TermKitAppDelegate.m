//
//  TermKitAppDelegate.m
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "TermKitAppDelegate.h"
#import "TermKitWindowController.h"
#import "TermKitPrefsController.h"

@implementation TermKitAppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSUserDefaults *defaults;
    
    defaults = [NSUserDefaults standardUserDefaults];
    [defaults registerDefaults:[NSDictionary dictionaryWithObjectsAndKeys:
                                @"YES", @"ignoreCase",
                                @"YES", @"usageLogging",
                                @"YES", @"WebKitDeveloperExtras",
                                [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"], @"version",
                                nil]];
    
    [self newWindow:self];
}

- (IBAction) openPreferences: sender {
    id prefsController = [[TermKitPrefsController alloc] init]; 
    [prefsController showWindow:self];
    [prefsController retain];
}

- (IBAction) newWindow: sender {
    id windowController = [[TermKitWindowController alloc] init]; 
    [windowController showWindow:self];
    [windowController retain];
}

@end
