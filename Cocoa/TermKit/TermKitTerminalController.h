//
//  TermKitTerminalController.h
//  TermKit
//
//  Created by Steven Wittens on 05/07/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface TermKitTerminalController : NSViewController {
    id webInspector;
}

- (id)init;
- (void)loadView;
- (void)showConsole;
- (void)hideConsole;
- (void)toggleConsole:(bool)show;

@end
