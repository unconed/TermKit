//
//  TermKitWindowController.h
//  TermKit
//
//  Created by Steven Wittens on 29/10/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>


@interface TermKitWindowController : NSWindowController {
    id terminalController;
}

- (id) init;
- (IBAction) showConsole: sender;
- (IBAction) newTerminal: sender;

@end
