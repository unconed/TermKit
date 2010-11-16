//
//  TermKitAppDelegate.h
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>

@interface TermKitAppDelegate : NSObject <NSApplicationDelegate> {
    NSWindow *window;
}

- (IBAction) newTerminal: sender;
- (IBAction) newWindow: sender;

@property (assign) IBOutlet NSWindow *window;

@end
