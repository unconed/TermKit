//
//  TermKitAppDelegate.m
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "TermKitAppDelegate.h"
#import "TermKitTerminalController.h"

@implementation TermKitAppDelegate

@synthesize window;

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSString* title = [[NSString alloc] initWithFormat:@"TermKit (%@)",
                       [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"]
                      ];
    [window setTitle:title];
}

- (IBAction) newTerminal: sender {
    id viewController = [[TermKitTerminalController alloc] initWithNibName:@"Terminal.nib" bundle:nil];
    id view = [viewController view];
    [[window contentView] addSubview:view];
}

@end
