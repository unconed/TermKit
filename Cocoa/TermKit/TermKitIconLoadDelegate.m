//
//  TermKitIconLoadDelegate.m
//  TermKit
//
//  Created by Steven Wittens on 15/10/10.
//  Parts copyright 2010 __MyCompanyName__. All rights reserved.
//  
//  Based on: SpecialPictureProtocol example by Apple
//

#import "TermKitIconLoadDelegate.h"
#import "TermKitIconProtocol.h"

@implementation TermKitIconLoadDelegate

/* returns a string that we will use as a key for pairing with
 our MyController object in the dictionary shared between our protocol
 and this controller object.  This will allow the protocol to get
 a reference back to the calling controller object should it need to.  */
+ (NSString*) callerKey {
    return @"caller";
}

/* Called just before a webView attempts to load a resource.  Here, we look at the
 request and if it's destined for our special protocol handler we modify the request
 so that it contains an NSDictionary containing some information we want to share
 between the code in this file and the custom NSURLProtocol.  */
-(NSURLRequest *)webView:(WebView *)sender resource:(id)identifier 
         willSendRequest:(NSURLRequest *)request redirectResponse:(NSURLResponse *)redirectResponse
          fromDataSource:(WebDataSource *)dataSource {

    // If this request can be handled by our special protocol.
    if ([TermKitIconProtocol canInitWithRequest:request]) {
        
        /* create a NSDictionary containing any values we want to share between
         our webView/delegate object we are running in now and the protocol handler.
         Here, we'll put a referernce to ourself in there so we can access this
         object from the special protocol handler. */
        NSDictionary *protocolVars = [NSDictionary dictionaryWithObject:self
                                                                forKey:[TermKitIconLoadDelegate callerKey]];
        
        /* make a new mutable copy of the request so we can add a reference to our
         dictionary record. */
        NSMutableURLRequest *protocolURLRequest = [[request mutableCopy] autorelease];
        
        /* call our category method to store away a reference to our dictionary. */
        [protocolURLRequest setProtocolVars:protocolVars];
        
        /* return the new modified request */
        return protocolURLRequest;
        
    } else {
        return request;
    }
}



/* this is an extra routine we added to show how the protocol could
 call back to the webView's delegate object while processing a request. */
- (void)callbackFromIconRequest:(NSURLRequest *)request
{
    NSLog(@"%@ received %@", self, NSStringFromSelector(_cmd));
}



@end