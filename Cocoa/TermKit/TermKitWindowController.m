//
//  TermKitWindowController.m
//  TermKit
//
//  Created by Steven Wittens on 29/10/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "TermKitWindowController.h"
#import "TermKitTerminalController.h"


@implementation TermKitWindowController {
}

- (id) init {
    self = [super initWithWindowNibName:@"Window"];
    if (self != nil) {
        NSString* title = [[NSString alloc] initWithFormat:@"TermKit (%@)",
                           [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"]
                           ];
        [[self window] setTitle:title];

        [self newTerminal:self];
        [title autorelease];
    }
    return self;
}

- (IBAction) showConsole: sender {
    [terminalController showConsole];
}

- (IBAction) newTerminal: sender {
    id contentView = [[self window] contentView];
    NSRect contentRect = [contentView frame];
    
    /*id */terminalController = [[TermKitTerminalController alloc] init];
    id terminalView = [terminalController view];
    [terminalView setFrame:contentRect];
    
    [contentView addSubview:terminalView];
    
    [terminalController retain];
}

@end
