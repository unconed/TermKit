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
    [TermKitIconProtocol registerProtocol];

    id delegate = [[TermKitIconLoadDelegate alloc] init];
    [self setResourceLoadDelegate:delegate];
}

@end
