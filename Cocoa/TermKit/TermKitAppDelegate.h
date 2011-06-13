//
//  TermKitAppDelegate.h
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>

@interface TermKitAppDelegate : NSObject {
}

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification;
- (IBAction) openPreferences: (id)sender;
- (IBAction) newWindow: (id)sender;

@end
