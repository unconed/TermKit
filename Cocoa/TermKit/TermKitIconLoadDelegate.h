//
//  TermKitWebResourceLoadDelegate.h
//  TermKit
//
//  Created by Steven Wittens on 15/10/10.
//  Parts copyright 2010 __MyCompanyName__. All rights reserved.
//  
//  Based on: SpecialPictureProtocol example by Apple
//

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

#import "TermKitIconProtocol.h"

@interface TermKitIconLoadDelegate : NSObject {
    IBOutlet WebView *webView;
}
+ (NSString*) callerKey;
- (void)callbackFromIconRequest:(NSURLRequest *)request;
@end
