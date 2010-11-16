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

- (IBAction) newTerminal: sender {
    id viewController = [[TermKitTerminalController alloc] initWithNibName:@"Terminal.nib" bundle:nil];
    id view = [viewController view];
    [[[self window] contentView] addSubview:view];
}

@end
