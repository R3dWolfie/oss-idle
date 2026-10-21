/** osu!web's BBCode (`BBCodeFromDB`) to HTML, for me! pages. Everything is
 *  escaped first, so only the markup produced here reaches the page. */

export type BBCodeOptions = {
	/** A signed proxy URL for an embedded image or audio file. */
	proxy: (url: string) => string;
	/** Character ids for `[profile]name[/profile]`, keyed by lower-cased name. */
	profiles: Map<string, number>;
	wrote: (name: string) => string;
	spoiler: string;
};

const escape = (text: string) => text
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

const unescape = (text: string) => text
	.replace(/&#39;/g, '\'')
	.replace(/&quot;/g, '"')
	.replace(/&gt;/g, '>')
	.replace(/&lt;/g, '<')
	.replace(/&amp;/g, '&');

// no quote, bracket, tag or kept embed: nothing later passes rewrite can reach inside an attribute
const SAFE = /^[^\s"<[\]\u0000]+$/;
// `//host` and `/\host` are other sites, not paths here
const isLink = (url: string) => SAFE.test(url) && /^(https?:\/\/|mailto:|\/(?![/\\])|#)/i.test(url);
// off-site links open outside the page: followed inside the game's /web frame, they
// would take the desktop app's bridge along
const linkAttrs = (href: string) => `href="${href}" rel="nofollow noopener"`
	+ (/^[/#]/.test(href) ? '' : ' target="_blank"');
const isMedia = (url: string) => SAFE.test(url) && /^https?:\/\//i.test(url);

// deeper nesting stays as text: each pass rescans the whole page
const MAX_DEPTH = 16;

/** Replace until nothing changes, so nested tags resolve from the inside out. */
const repeat = (text: string, pattern: RegExp, fn: (...m: string[]) => string) => {
	for (let depth = 0; depth < MAX_DEPTH; depth++) {
		const next = text.replace(pattern, fn);
		if (next === text) return text;
		text = next;
	}
	return text;
};

/** The paired tag `name`, its content holding no other opening of it. */
const paired = (name: string, arg = '', block = false) => {
	const nl = block ? '\\n?' : '';
	const body = `((?:(?!\\[${name}[=\\]])[\\s\\S])*?)`;
	return new RegExp(`\\[${name}${arg}\\]${nl}${body}\\[/${name}\\]${nl}`, 'gi');
};

const link = (href: string, body: string) => isLink(href)
	? `<a ${linkAttrs(href)}>${body}</a>`
	: undefined;

const imagemap = (body: string, opts: BBCodeOptions) => {
	const [image, ...lines] = body.trim().split('\n').map(l => l.trim());
	if (!isMedia(image)) return undefined;
	const areas = lines.flatMap(line => {
		const m = /^([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) (\S+)(?: (.*))?$/.exec(line);
		if (!m) return [];
		const style = `left:${m[1]}%;top:${m[2]}%;width:${m[3]}%;height:${m[4]}%;`;
		const title = m[6] ?? '';
		return m[5] !== '#' && isLink(m[5])
			? [`<a class="imagemap__link" ${linkAttrs(m[5])} style="${style}" title="${title}"></a>`]
			: [`<span class="imagemap__link" style="${style}" title="${title}"></span>`];
	});
	return `<div class="imagemap"><img class="imagemap__image" src="${escape(opts.proxy(unescape(image)))}" loading="lazy" alt="">${areas.join('')}</div>`;
};

const list = (open: string, body: string) => {
	const items = body.split(/\[\*\]\n?/).slice(1)
		.map(i => `<li>${i.replace(/\n$/, '')}</li>`)
		.join('');
	return open ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
};

const box = (title: string, body: string) => '<details class="bbcode-spoilerbox">'
	+ `<summary class="bbcode-spoilerbox__link">${title}</summary>`
	+ `<div class="bbcode-spoilerbox__body">${body}</div></details>`;

/** The names `[profile]` tags link to, for the caller to resolve. */
export const profileNames = (raw: string): string[] =>
	[...raw.matchAll(/\[profile\]([^[\]\n]{1,255})\[\/profile\]/gi)].map(m => m[1].toLowerCase());

export function renderBBCode(raw: string, opts: BBCodeOptions): string {
	let text = escape(raw.replace(/\r\n?/g, '\n').replace(/\u0000/g, ''));

	const kept: string[] = [];
	const keep = (html: string) => `\u0000${kept.push(html) - 1}\u0000`;
	text = text.replace(paired('code', '', true), (_, body: string) => keep(`<pre>${body}</pre>`));
	text = text.replace(paired('c'), (_, body: string) => keep(`<code>${body}</code>`));

	// embeds are final: no later pass may touch their attributes
	text = text.replace(paired('imagemap', '', true), (all, body: string) => {
		const html = imagemap(body, opts);
		return html ? keep(html) : all;
	});
	text = text.replace(/\[img\]([^[\s]+?)\[\/img\]/gi, (all, url: string) => isMedia(url)
		? keep(`<img src="${escape(opts.proxy(unescape(url)))}" loading="lazy" alt="">`)
		: all);
	text = text.replace(/\[audio\]([^[\s]+?)\[\/audio\]/gi, (all, url: string) => isMedia(url)
		? keep(`<audio controls preload="none" src="${escape(opts.proxy(unescape(url)))}"></audio>`)
		: all);
	text = text.replace(/\[youtube\]([\w-]+)\[\/youtube\]/gi, (_, id: string) =>
		keep(`<div class="bbcode__video"><iframe src="https://www.youtube.com/embed/${id}?rel=0" allowfullscreen></iframe></div>`));

	text = repeat(text, paired('b'), (_, b) => `<strong>${b}</strong>`);
	text = repeat(text, paired('i'), (_, b) => `<em>${b}</em>`);
	text = repeat(text, paired('u'), (_, b) => `<u>${b}</u>`);
	text = repeat(text, paired('s'), (_, b) => `<del>${b}</del>`);
	text = repeat(text, paired('strike'), (_, b) => `<del>${b}</del>`);
	text = repeat(text, paired('spoiler'), (_, b) => `<span class="spoiler">${b}</span>`);
	text = repeat(text, paired('color', '=(#[0-9a-f]{3,8}|[a-z]+)'), (_, c, b) =>
		`<span style="color:${c};">${b}</span>`);
	text = repeat(text, paired('size', '=(\\d+)'), (_, s, b) =>
		`<span style="font-size:${Math.min(200, Math.max(30, Number(s)))}%;">${b}</span>`);

	text = repeat(text, paired('url', '=([^[\\]\\s]+)'), (all, href, b) => link(href, b) ?? all);
	text = repeat(text, paired('url'), (all, href) => link(href, href) ?? all);
	text = repeat(text, paired('email', '=([^[\\]\\s@]+@[^[\\]\\s]+)'), (all, to, b) =>
		link(`mailto:${to}`, b) ?? all);
	text = repeat(text, paired('email'), (all, to) =>
		/^[^\s@]+@\S+$/.test(to) ? link(`mailto:${to}`, to) ?? all : all);
	text = repeat(text, paired('profile', '=(\\d+)'), (_, id, b) => `<a href="/web/c/${id}">${b}</a>`);
	text = repeat(text, paired('profile'), (_, name: string) => {
		const id = opts.profiles.get(unescape(name).toLowerCase());
		return id ? `<a href="/web/c/${id}">${name}</a>` : `<strong>${name}</strong>`;
	});

	text = repeat(text, paired('list', '(=[^[\\]]*)?', true), (_, open, b) => list(open, b));
	text = repeat(text, paired('heading', '', true), (_, b) => `<h2>${b}</h2>`);
	text = repeat(text, paired('notice', '', true), (_, b) => `<div class="well">${b}</div>`);
	text = repeat(text, paired('centre', '', true), (_, b) => `<div class="bbcode-centre">${b}</div>`);
	const quoted = '(?:=&quot;((?:(?!&quot;).){1,255})&quot;)?';
	text = repeat(text, paired('quote', quoted, true), (_, name, b) =>
		`<blockquote>${name ? `<h4>${escape(opts.wrote(unescape(name)))}</h4>` : ''}${b}</blockquote>`);
	text = repeat(text, paired('box', '=([^[\\]]*)', true), (_, title, b) => box(title, b));
	text = repeat(text, paired('spoilerbox', '', true), (_, b) => box(escape(opts.spoiler), b));

	return text
		.replace(/\n/g, '<br>')
		.replace(/\u0000(\d+)\u0000/g, (_, i: string) => kept[Number(i)]);
}
