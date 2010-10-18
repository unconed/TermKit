//
//  TermKitIconProtocol.m
//  TermKit
//
//  Created by Steven Wittens on 15/10/10.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import <Foundation/NSError.h>

#import "TermKitIconProtocol.h"
#import "TermKitIconLoadDelegate.h"

#import "NSImage+QuickLook.h"

/* data passing categories on NSURLRequest and NSMutableURLRequest.  see the
 header file for more info.  */

@implementation NSURLRequest (TermKitIconProtocol)

- (NSDictionary *)protocolVars {
    return [NSURLProtocol propertyForKey:[TermKitIconProtocol protocolVarsKey] inRequest:self];
}

@end



@implementation NSMutableURLRequest (TermKitIconProtocol)

- (void)setProtocolVars:(NSDictionary *)protocolVars {
    NSDictionary *protocolVarsCopy = [protocolVars copy];
    
    [NSURLProtocol setProperty:protocolVarsCopy
                        forKey:[TermKitIconProtocol protocolVarsKey] inRequest:self];
    [protocolVarsCopy release];
}

@end



/**
 * Base URL protocol handler for file icons.
 */
@implementation TermKitIconProtocol


/* our own class method.  Here we return the NSString used to mark
 urls handled by our special protocol. */
+ (NSString*) protocolScheme {
    return @"termkit-icon";
}

/* our own class method.  Here we return the NSString used to identify
 the property we add to the NSURLRequest object for passing around data. */
+ (NSString*) protocolVarsKey {
    return @"protocolVarsKey";
}


/* our own class method.  We call this routine to handle registration
 of our special protocol.  You should call this routine BEFORE any urls
 specifying your special protocol scheme are presented to webkit. */
+ (void) registerProtocol {
    NSLog(@"registerProtocol");

    static BOOL inited = NO;
    if ( ! inited ) {
        [NSURLProtocol registerClass:[TermKitIconDefaultProtocol class]];
        [NSURLProtocol registerClass:[TermKitIconPreviewProtocol class]];
        inited = YES;
    }
}


/* class method for protocol called by webview to determine if this
 protocol should be used to load the request. */
+ (BOOL)canInitWithRequest:(NSURLRequest *)theRequest {

    NSLog(@"%@ received %@ with url='%@' and scheme='%@'", 
         self, NSStringFromSelector(_cmd),
         [[theRequest URL] absoluteString], [[theRequest URL] scheme]);
    
    /* get the scheme from the URL */
    NSString *theScheme = [[theRequest URL] scheme];
    
    /* return true if it matches the scheme we're using for our protocol. */
    return ([theScheme caseInsensitiveCompare: [self protocolScheme]] == NSOrderedSame );
}


/* if canInitWithRequest returns true, then webKit will call your
 canonicalRequestForRequest method so you have an opportunity to modify
 the NSURLRequest before processing the request */
+(NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *)request {
    
    NSLog(@"%@ received %@", self, NSStringFromSelector(_cmd));
    
    /* we don't do any special processing here, though we include this
     method because all subclasses must implement this method. */
    
    return request;
}

/* return image for path */
-(NSImage*) imageForIconPath:(NSString*)iconPath {
    return nil;
}

/* our main loading routine.  This is where we do most of our processing
 for our class.  In this case, all we are doing is taking the path part
 of the url and rendering it in 36 point system font as a jpeg file.  The
 interesting part is that we create the jpeg entirely in memory and return
 it back for rendering in the webView.  */
- (void)startLoading {
    NSLog(@"%@ received %@ - start", self, NSStringFromSelector(_cmd));
    
    /* retrieve the current request. */
    NSURLRequest *request = [self request];
    id<NSURLProtocolClient> client = [self client];
    
    /* extract our special variables from the request. */
    NSDictionary* protocolVars = [request protocolVars];
    if (protocolVars) {
        /* extract a reference to our WebResourceLoadDelegate object. */
        TermKitIconLoadDelegate* theCaller = (TermKitIconLoadDelegate*) [protocolVars objectForKey:[TermKitIconLoadDelegate callerKey]];
        if (theCaller) {
            [theCaller callbackFromIconRequest: request];
        }
    }
    /* Since the scheme is free to encode the url in any way it chooses, here
    we are using the url text to identify files names in our resources folder
    that we would like to display. */
    
    /* get the path component from the url */
    NSString* iconPath = [[[[request URL] path] substringFromIndex:1] stringByReplacingPercentEscapesUsingEncoding:NSUTF8StringEncoding];

    /* render into an icon */
    NSImage* icon = [self imageForIconPath:iconPath];
    
    if (icon) {
        /* get TIFF data */
        NSData *data = [icon TIFFData];
        
        /* prepare URL response */
        NSURLResponse *response = 
        [[NSURLResponse alloc] initWithURL:[request URL] 
                                  MIMEType:@"image/tiff" 
                     expectedContentLength:-1 
                          textEncodingName:nil];
        
        /* send data to client */
        
        [client URLProtocol:self didReceiveResponse:response
         cacheStoragePolicy:NSURLCacheStorageNotAllowed];
        
        [client URLProtocol:self didLoadData:data];
        
        [client URLProtocolDidFinishLoading:self];
        
        [response release];
    }
    else {
        /* in case of error, 404 */
        int resultCode;
        resultCode = NSURLErrorFileDoesNotExist;
        [client URLProtocol:self didFailWithError:[NSError errorWithDomain:NSURLErrorDomain
                                                                      code:resultCode userInfo:nil]];
    }
    
    /* added the extra log statement here so you can see that stopLoading is called
     by the underlying machinery before we leave this routine. */
    NSLog(@"%@ received %@ - end", self, NSStringFromSelector(_cmd));
}

/* called to stop loading or to abort loading.  We don't do anything special
 here. */
- (void)stopLoading
{
    NSLog(@"%@ received %@", self, NSStringFromSelector(_cmd));
}


@end

/**
 * Specific URL protocol handler for default file icons.
 */

@implementation TermKitIconDefaultProtocol

/* our own class method.  Here we return the NSString used to mark
 urls handled by our special protocol. */
+ (NSString*) protocolScheme {
    return @"termkit-icon-default";
}

/* return image for path */
- (NSImage*) imageForIconPath:(NSString*)iconPath {
    NSSize iconSize = NSMakeSize(32, 32);

    NSImage *icon = [[NSWorkspace sharedWorkspace] iconForFileType:([iconPath isEqualToString:@"/"] ? iconPath : NSFileTypeForHFSTypeCode(kGenericFolderIcon))];
    if (icon) {
        [icon setSize:iconSize];
    }
    return icon;
}


@end

/**
 * Specific URL protocol handler for live preview file icons.
 */
@implementation TermKitIconPreviewProtocol

/* our own class method.  Here we return the NSString used to mark
 urls handled by our special protocol. */
+ (NSString*) protocolScheme {
    return @"termkit-icon-preview";
}

/* return image for path */
- (NSImage*) imageForIconPath:(NSString*)iconPath {
    NSSize iconSize = NSMakeSize(32, 32);
    
    NSImage* icon = [NSImage imageWithPreviewOfFileAtPath:(NSString *)iconPath ofSize:(NSSize)iconSize asIcon:YES];
    return icon;
}


@end

/* NSImage -> tiff utility category. */

@implementation NSImage (TIFFConversionUtils)

/* returns jpeg file interchange format encoded data for an NSImage regardless of the
 original NSImage encoding format.  compressionValue is between 0 and 1.  
 values 0.6 thru 0.7 are fine for most purposes.  */
- (NSData *)TIFFData {
    
    NSLog(@"tiffdata size", [self size]);
    
    /* Figure out right representation by size. */
    NSSize selfSize = [self size],
           maxSize = NSMakeSize(INT_MAX, INT_MAX);
    NSImageRep *rep, *match = nil;
    for (rep in [self representations]) {
        NSSize size = [rep size];
        if (size.width < maxSize.width && size.height < maxSize.height) {
            if (size.width >= selfSize.width && size.height >= selfSize.height) {
                match = rep;
            }
        }
    }

    if (match) {
        /* Convert the NSImage into a raster representation. */
        NSBitmapImageRep* myBitmapImageRep = [NSBitmapImageRep imageRepWithData: [match TIFFRepresentation]];

        /* Convert to .tiff */
        return [myBitmapImageRep representationUsingType: NSTIFFFileType properties:nil];
    }
    return nil;
}

@end