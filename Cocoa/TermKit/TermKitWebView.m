//
//  TermKitWebView.m
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "TermKitWebView.h"

@implementation TermKitWebView

- (void)awakeFromNib {
    // Register icon protocol.
    [TermKitIconProtocol registerProtocol];

    // Register resource delegate.
    delegate = [[TermKitIconLoadDelegate alloc] init];
    [self setResourceLoadDelegate:delegate];
    
    // Set self as frame load delegate.
    [self setFrameLoadDelegate:self];
    
    [delegate retain];
}

/**
 * Hook into window/frame loading.
 */
- (void)webView:(WebView*)webView windowScriptObjectAvailable:(WebScriptObject*)windowScriptObject {
    // Create window.preferences object.
    [[self windowScriptObject] setValue:self forKey:@"preferences"];
    [config retain];
}

- (void)dealloc {
    if (delegate)
        [delegate release];
    if (config)
        [config release];
    [super dealloc];
}

/**
 * Export .get() method for getting preference values.
 */
+ (NSString *)webScriptNameForSelector:(SEL)selector {
    if (selector == @selector(get:)) {
        return @"get";
    }
    return nil;
}

/**
 * Export .get: selector for getting preference values.
 */
+ (BOOL)isSelectorExcludedFromWebScript:(SEL)selector {
    if (selector == @selector(get:)) {
        return NO;
    }
    return YES;
}

/**
 * Get user preferences directly from controller.
 */
- (id)get:(NSString*)key {
    if (!key) return false;
    
    // Fetch user settings.
    NSUserDefaults* defaults;    
    defaults = [NSUserDefaults standardUserDefaults];    
    
    id value = [defaults stringForKey:key];
    if (value == nil) {
        return false;
    }
    return value;
}

@end