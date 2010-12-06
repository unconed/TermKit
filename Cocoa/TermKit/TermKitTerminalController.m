//
//  TermKitTerminalController.m
//  TermKit
//
//  Created by Steven Wittens on 05/07/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "TermKitTerminalController.h"


@implementation TermKitTerminalController

- (id)init {
    self = [super initWithNibName:@"Terminal.nib" bundle:nil];
    if (self != nil) {
        //
    }
    return self;
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
};

@end
