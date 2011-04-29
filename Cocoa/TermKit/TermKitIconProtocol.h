//
//  TermKitIconProtocol.h
//  TermKit
//
//  Created by Steven Wittens on 15/10/10.
//  Parts copyright 2010 __MyCompanyName__. All rights reserved.
//  
//  Based on: SpecialPictureProtocol example by Apple
//

#import <Cocoa/Cocoa.h>
#import <Foundation/Foundation.h>
#import <Foundation/NSURLRequest.h>
#import <Foundation/NSURLProtocol.h>

@interface TermKitIconProtocol : NSURLProtocol {
}
+ (NSString*) protocolVarsKey;
+ (void) registerProtocol;
+ (NSString*) protocolScheme;
- (NSImage*) imageForIconPath:(NSString*)iconPath;
@end

@interface TermKitIconPreviewProtocol : TermKitIconProtocol {
}
+ (NSString*) protocolScheme;
- (NSImage*) imageForIconPath:(NSString*)iconPath;
@end

@interface TermKitIconDefaultProtocol : TermKitIconProtocol {
}
+ (NSString*) protocolScheme;
- (NSImage*) imageForIconPath:(NSString*)iconPath;
@end

@interface NSURLRequest (TermKitIconProtocol)
- (NSDictionary *)protocolVars;
@end

@interface NSMutableURLRequest (TermKitIconProtocol)
- (void)setProtocolVars:(NSDictionary *)caller;
@end


@interface NSImage (TIFFConversionUtils)
- (NSData *)TIFFData;
@end
