// Copyright 2026 Tayga contributors. Licensed under Apache-2.0.
import {formatProductText, sanitizeProductHtml} from './tms_markdown';

describe('TMS original product Markdown boundary', () => {
    test('preserves checklist descriptions, headings and safe links', () => {
        const html = formatProductText('### Recovery\n\n**Verify** [run](https://example.test/run)');
        expect(html).toContain('<h3>Recovery</h3>');
        expect(html).toContain('<strong>Verify</strong>');
        expect(html).toContain('href="https://example.test/run"');
    });
    test('removes active HTML in both Markdown and direct HTML paths', () => {
        const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script><iframe src="https://other.test"></iframe><a href="javascript:alert(3)">click</a><form><input autofocus></form>';
        for (const html of [formatProductText(payload), sanitizeProductHtml(payload)]) {
            const root = document.createElement('div');root.innerHTML = html;
            expect(root.querySelector('script,iframe,form,input')).toBeNull();
            expect(root.querySelector('img')?.getAttribute('onerror')).toBeNull();
            expect(root.querySelector('a')?.getAttribute('href')).toBeNull();
        }
    });
});
