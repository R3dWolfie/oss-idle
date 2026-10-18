import {
	Fragment,
	useState,
} from 'react';
import { Asset } from '../../router';
import Link from '../../components/Link';
import {
	LANGUAGES,
	type Language,
} from './samples';

export type TocItem = { id: string; title: string; children?: TocItem[] };

/** The dark column on the left: logo, languages, search and the contents, the open section unfolded. */
export default function DocsToc({ items, active, language, onLanguage, onGo }: {
	items: TocItem[];
	active: string | undefined;
	language: Language;
	onLanguage: (language: Language) => void;
	onGo: (id: string) => void;
}) {
	const [search, setSearch] = useState('');
	const needle = search.trim().toLowerCase();
	const found = needle
		? items.flatMap(i => [i, ...i.children ?? []]).filter(i => i.title.toLowerCase().includes(needle))
		: [];
	const open = items.find(i => i.id === active || i.children?.some(c => c.id === active));

	const link = (item: TocItem) => <li key={item.id} className='docs-toc__item'>
		<a
			href={`#${item.id}`}
			className={item.id === active ? 'docs-toc__focus' : undefined}
			onClick={e => { e.preventDefault(); onGo(item.id); }}
		>{item.title}</a>
	</li>;

	return <>
		<img className='docs-toc__logo' src={Asset('/idle-white.png')} alt='osu!idle' />
		<div className='docs-toc__languages'>
			{LANGUAGES.map(l => <button
				key={l}
				type='button'
				className={l === language ? 'docs__language--active' : undefined}
				onClick={() => onLanguage(l)}
			>{l}</button>)}
		</div>
		<div className='docs-toc__search'>
			<input type='text' placeholder='Search' value={search} onChange={e => setSearch(e.target.value)} />
		</div>
		{needle && <ul className='docs-toc__results'>
			{found.length ? found.map(i => link(i)) : <li className='docs-toc__item'>No results</li>}
		</ul>}
		<ul>
			{items.map(item => <Fragment key={item.id}>
				{link(item)}
				{item === open && item.children && <ul className='docs-toc__sub'>
					{item.children.map(c => link(c))}
				</ul>}
			</Fragment>)}
		</ul>
		<ul className='docs-toc__footer'>
			<li><Link to='/'>osu!idle</Link></li>
			<li><Link to='/settings'>OAuth applications</Link></li>
			<li><Link to='/legal/api'>API Terms of Use</Link></li>
		</ul>
	</>;
}
