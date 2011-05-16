//
//  TermKitWebView.h
//  TermKit
//
//  Created by Steven Wittens on 30/06/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

#import "TermKitIconLoadDelegate.h"

@interface TermKitWebView : WebView {
    id delegate;
    id config;
}

- (void)awakeFromNib;
- (void)webView:(WebView*)webView windowScriptObjectAvailable:(WebScriptObject*)windowScriptObject;
- (void)dealloc;

+ (NSString *)webScriptNameForSelector:(SEL)selector;
+ (BOOL)isSelectorExcludedFromWebScript:(SEL)selector;
- (id)get:(NSString*)key;
 
@end
