//
//  TermKitTerminalController.m
//  TermKit
//
//  Created by Steven Wittens on 05/07/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "TermKitTerminalController.h"
#import "WebInspector.h"

@implementation TermKitTerminalController

- (id)init {
    self = [super initWithNibName:@"Terminal.nib" bundle:nil];
    if (self != nil) {
        //
    }
    return self;
};

- (void)showConsole {
    [self toggleConsole:true];
};

- (void)hideConsole {
    [self toggleConsole:false];
};

- (void)toggleConsole:(bool)show {
    WebView *view = (WebView*)[self view];
    if (!webInspector) {
        webInspector = [[WebInspector alloc] initWithWebView:view];
        [webInspector detach:view];
    }
        
    if (show) {
        [webInspector showConsole:view];
    }
    else {
        [webInspector show:view];
    }
};

- (void)loadView {
    [super loadView];
    NSString* resourcePath = [[NSBundle mainBundle] resourcePath];
    NSString* basePath = [[NSString alloc] initWithFormat:@"%@/HTML/index.html", resourcePath];
    
    WebView* webView = (WebView*)[self view];
    NSURL* url = [NSURL fileURLWithPath:basePath];
    NSURLRequest* urlRequest = [[NSURLRequest alloc] initWithURL:url];
    
    [[webView mainFrame] loadRequest:urlRequest];

    NSLog(@"loadView loading URL: %@", url);
    NSLog(@"info plist: %@", [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"]);
    
    [urlRequest autorelease];
    [basePath autorelease];
};

@end
