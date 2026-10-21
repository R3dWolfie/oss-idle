import {
	describe,
	expect,
	it,
} from 'vitest';
import { renderBBCode } from '../../server/src/bbcode';

const render = (raw: string) => renderBBCode(raw, {
	proxy: url => `/p?u=${encodeURIComponent(url)}`,
	profiles: new Map([['peppy', 2]]),
	wrote: name => `${name} wrote:`,
	spoiler: 'SPOILER',
});

describe('renderBBCode', () => {
	it('escapes everything that is not a tag', () => {
		expect(render('<script>alert(1)</script> & "x"'))
			.toBe('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;');
	});

	it('nests inline tags', () => {
		expect(render('[b]a [i]b[/i][/b]')).toBe('<strong>a <em>b</em></strong>');
	});

	it('leaves unmatched tags as text', () => {
		expect(render('[b]open')).toBe('[b]open');
	});

	it('only links safe schemes', () => {
		expect(render('[url=javascript:alert(1)]x[/url]')).toBe('[url=javascript:alert(1)]x[/url]');
		expect(render('[url=https://a.b/?x=1&y=2]x[/url]')).toBe('<a href="https://a.b/?x=1&amp;y=2" rel="nofollow noopener" target="_blank">x</a>');
		expect(render('[url=/web/c/2]x[/url]')).toBe('<a href="/web/c/2" rel="nofollow noopener">x</a>');
		expect(render('[url=//evil.example]x[/url]')).not.toContain('<a');
		expect(render('[url=/\\evil.example]x[/url]')).not.toContain('<a');
	});

	it('never lets a later tag into an attribute', () => {
		expect(render('[url]https://a[color=red]x[/color][/url]')).not.toContain('<a');
		expect(render('[imagemap]\nhttps://i/a.png\n0 0 10 10 # [color=red]t[/color]\n[/imagemap]'))
			.toContain('title="[color=red]t[/color]"');
		expect(render('[url=/[img]https://i/a.png[/img]]x[/url]')).not.toContain('<a');
	});

	it('renders hostile pages quickly', () => {
		const start = performance.now();
		render(`[quote="${'"]'.repeat(30000)}`);
		render(`${'[b]'.repeat(8000)}x${'[/b]'.repeat(8000)}`);
		render('[box='.repeat(12000));
		expect(performance.now() - start).toBeLessThan(500);
	});

	it('proxies media with the unescaped URL', () => {
		expect(render('[img]https://i/a.png?x=1&y=2[/img]')).toBe('<img src="/p?u=https%3A%2F%2Fi%2Fa.png%3Fx%3D1%26y%3D2" loading="lazy" alt="">');
		expect(render('[img]file:///etc/passwd[/img]')).toBe('[img]file:///etc/passwd[/img]');
	});

	it('clamps sizes and checks colours', () => {
		expect(render('[size=999]x[/size]')).toBe('<span style="font-size:200%;">x</span>');
		expect(render('[color=red;background:url(x)]x[/color]'))
			.toBe('[color=red;background:url(x)]x[/color]');
	});

	it('keeps code verbatim', () => {
		expect(render('[code][b]x[/b]\ny[/code]')).toBe('<pre>[b]x[/b]\ny</pre>');
	});

	it('builds lists, boxes and quotes', () => {
		expect(render('[list]\n[*]a\n[*]b\n[/list]')).toBe('<ul><li>a</li><li>b</li></ul>');
		expect(render('[list=1][*]a[/list]')).toBe('<ol><li>a</li></ol>');
		expect(render('[box=Hi]x[/box]'))
			.toContain('<summary class="bbcode-spoilerbox__link">Hi</summary>');
		expect(render('[quote="peppy"]x[/quote]')).toBe('<blockquote><h4>peppy wrote:</h4>x</blockquote>');
	});

	it('links known profiles', () => {
		expect(render('[profile]PEPPY[/profile] [profile]nobody[/profile]'))
			.toBe('<a href="/web/c/2">PEPPY</a> <strong>nobody</strong>');
	});

	it('turns newlines into breaks', () => {
		expect(render('a\r\nb')).toBe('a<br>b');
	});
});
