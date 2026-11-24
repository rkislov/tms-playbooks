// Copyright 2026 Tayga contributors. Licensed under Apache-2.0.
import React from 'react';
import DOMPurify from 'dompurify';
import {marked} from 'marked';

// Both boundaries sanitize: plugins may pass preformatted strings directly to
// messageHtmlToComponent rather than going through formatText first.
export function sanitizeProductHtml(html: string): string {
    return DOMPurify.sanitize(html, {FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input'], FORBID_ATTR: ['style']});
}
export function formatProductText(text: string): string {
    return sanitizeProductHtml(marked.parse(text || '', {async: false, gfm: true, breaks: true}));
}
export function productHtmlToComponent(html: string) {
    return <span className='tms-product-markdown' dangerouslySetInnerHTML={{__html: sanitizeProductHtml(html)}}/>;
}
