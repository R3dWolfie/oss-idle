import './Docs.css';
import {
	useEffect,
	useState,
} from 'react';
import { API_URL } from '../../api/client';
import {
	ENDPOINTS,
	OBJECTS,
} from './content';
import {
	LANGUAGES,
	type Language,
} from './samples';
import DocsToc, { type TocItem } from './DocsToc';
import DocsGuide from './DocsGuide';
import DocsEndpoint from './DocsEndpoint';
import DocsObject from './DocsObject';

const LANGUAGE_KEY = 'oss-idle:docs-language';

const TOC: TocItem[] = [
	{
		id: 'introduction', title: 'Introduction',
	},
	{
		id: 'terms-of-use', title: 'Terms of Use',
	},
	{
		id: 'endpoint', title: 'Endpoint', children: [{
			id: 'base-url', title: 'Base URL',
		}],
	},
	{
		id: 'authentication',
		title: 'Authentication',
		children: [
			['registering-an-oauth-application', 'Registering an OAuth application'],
			['authorization-code-grant', 'Authorization Code Grant'],
			['client-credentials-grant', 'Client Credentials Grant'],
			['using-the-access-token', 'Using the access token to access the API'],
			['resource-owner', 'Resource Owner'],
			['scopes', 'Scopes'],
			['managing-oauth-applications', 'Managing OAuth applications'],
		].map(([id, title]) => ({
			id, title,
		})),
	},
	...ENDPOINTS.map(s => ({
		id: s.id,
		title: s.title,
		children: s.endpoints.map(e => ({
			id: e.id, title: e.title,
		})),
	})),
	{
		id: 'object-structures',
		title: 'Object Structures',
		children: OBJECTS.map(o => ({
			id: o.id, title: o.title,
		})),
	},
];

const savedLanguage = (): Language => {
	try {
		const saved = localStorage.getItem(LANGUAGE_KEY);
		return LANGUAGES.find(l => l === saved) ?? 'bash';
	} catch {
		return 'bash';
	}
};

const HEADINGS = '.docs__content h1[id], .docs__content h2[id]';

/** The heading the reader is in: the last one scrolled past the top. */
const currentHeading = () => {
	const headings = [...document.querySelectorAll<HTMLElement>(HEADINGS)];
	const passed = headings.filter(h => h.getBoundingClientRect().top < 100);
	return (passed[passed.length - 1] ?? headings[0])?.id;
};

/** The public API reference, after osu!'s (osu.ppy.sh/docs): English only, not sent to Crowdin. */
export default function Docs() {
	const api = API_URL || window.location.origin;
	const site = window.location.origin;
	const [language, setLanguage] = useState(savedLanguage);
	const [active, setActive] = useState<string>();
	const [menu, setMenu] = useState(false);

	useEffect(() => {
		let frame = 0;
		const spy = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => setActive(currentHeading()));
		};
		spy();
		window.addEventListener('scroll', spy, { passive: true });
		if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
		return () => window.removeEventListener('scroll', spy);
	}, []);

	// the code column changes height with the language
	useEffect(() => setActive(currentHeading()), [language]);

	const pick = (next: Language) => {
		setLanguage(next);
		try {
			localStorage.setItem(LANGUAGE_KEY, next);
		} catch { /* the pick just won't be remembered */ }
	};

	const go = (id: string) => {
		document.getElementById(id)?.scrollIntoView();
		history.replaceState(history.state, '', `#${id}`);
		setMenu(false);
	};

	return <div className='docs'>
		<button type='button' className='docs__menu' onClick={() => setMenu(!menu)}>MENU</button>
		<nav className={`docs-toc ${menu ? 'docs-toc--open' : ''}`}>
			<DocsToc items={TOC} active={active} language={language} onLanguage={pick} onGo={go} />
		</nav>
		<div className='docs__page'>
			<div className='docs__dark' />
			<div className='docs__languages'>
				{LANGUAGES.map(l => <button
					key={l}
					type='button'
					className={l === language ? 'docs__language--active' : undefined}
					onClick={() => pick(l)}
				>{l}</button>)}
			</div>
			<div className='docs__content'>
				<DocsGuide api={api} site={site} language={language} />
				{ENDPOINTS.map(section => <section key={section.id}>
					<h1 id={section.id}>{section.title}</h1>
					{section.endpoints.map(e => <DocsEndpoint key={e.id} endpoint={e} api={api} language={language} />)}
				</section>)}
				<h1 id='object-structures'>Object Structures</h1>
				{OBJECTS.map(o => <DocsObject key={o.id} object={o} />)}
				<h2 id='timestamp'>Timestamp</h2>
				<p>An ISO 8601 date, in UTC: <code>2026-10-18T12:00:00.000Z</code>.</p>
			</div>
		</div>
	</div>;
}
