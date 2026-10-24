import { ph } from '@lingui/core/macro';
import {
	useEffect,
	useRef,
	useState,
} from 'react';
import useKeyboardOwner from '../../input/keyboardOwner';
import {
	Plural,
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import type { PageAction } from '../page/pageBar';
import { installedSkins } from '../../db/schema/skin';
import {
	browseSkins,
	getSkin,
	skinIconUrl,
	recordSkinDownload,
	Skin,
} from '../../online/skins';
import { installSkin } from '../../osu/skin/skinActions';
import { remoteSource } from '../../osu/skin/sources';
import Account from '../../online/account';
import ConfirmMenu, { Confirm } from '../ConfirmMenu';
import ListingIcon from '../listing/ListingIcon';
import SkinView, { type SkinContent } from './SkinView';

type Sort = 'created' | 'updated' | 'downloads';

export default function BrowseSkinsView() {
	const { t } = useLingui();
	const [installed] = useSynced(installedSkins);
	const installedIds = new Set(installed.map(s => s.id));
	const [list, setList] = useState<Skin[] | undefined>();
	const [detail, setDetail] = useState<Skin | undefined>();
	const [content, setContent] = useState<SkinContent>();
	const [confirming, setConfirming] = useState<Confirm | undefined>();
	const [query, setQuery] = useState('');
	const searchRef = useRef<HTMLInputElement>(null);
	useKeyboardOwner(searchRef, { active: !detail });
	const [sort, setSort] = useState<Sort>('created');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const refresh = () => {
		setError(undefined);
		return browseSkins({
			q: query.trim() || undefined, sort, dir: 'desc', 
		})
			.then(setList)
			.catch(e => setError(String(e.message ?? e)));
	};
	useEffect(() => { void refresh(); }, [sort]);

	// Count this player's install once (server dedupes); reflect the new total in
	// the list/detail. Signed-out players can't be counted, so skip the call.
	const recordDownload = async (id: number) => {
		if (!Account.character.get()) return;
		try {
			const { downloads } = await recordSkinDownload(id);
			setList(prev => prev?.map(a => a.id === id ? {
				...a, downloads, 
			} : a));
			setDetail(prev => prev && prev.id === id ? {
				...prev, downloads, 
			} : prev);
		} catch { /* a counter miss must not fail the local install */ }
	};

	const doInstall = (dto: Skin) => {
		setBusy(true);
		void installSkin(dto)
			.then(() => recordDownload(dto.id))
			.catch(e => setError(String((e as Error).message ?? e)))
			.finally(() => setBusy(false));
	};

	// the files are listed first; only what is shown of them is downloaded
	const openDetail = (a: Skin) => {
		setContent(undefined);
		setDetail(a);
		void getSkin(a.id)
			.then(({ files }) => setContent({
				files, source: remoteSource(files),
			}))
			.catch(e => setError(String((e as Error).message ?? e)));
	};

	// Row action (inline, in the list).
	const installButton = (a: Skin) => installedIds.has(a.id)
		? <span className='listing__installed'><Trans>Installed</Trans></span>
		: <button 
			className='listing-btn listing-btn--primary' 
			disabled={busy} 
			onClick={() => doInstall(a)}
		>
			<Trans>Install</Trans>
		</button>;

	// Detail-view action (lives in the scene's bottom bar).
	const barInstall = (a: Skin): PageAction => installedIds.has(a.id)
		? {
			id: 'installed',
			label: <Trans>Installed</Trans>,
			static: true,
			order: 20,
		}
		: {
			id: 'install',
			label: <Trans>Install</Trans>,
			onClick: () => doInstall(a),
			disabled: busy,
			order: 20,
		};

	return (
		<>
			{detail
				? <SkinView 
					detail={detail}
					content={content}
					actions={[barInstall(detail)]}
					onBack={() => setDetail(undefined)}
				/>
				: (
					<>
						<div className='listings__toolbar'>
							<span className='listings__search-label'><Trans>Search:</Trans></span>
							<input
								ref={searchRef}
								className='listings__search'
								value={query}
								placeholder={t`name, author or tag`}
								onChange={e => setQuery(e.target.value)}
								onKeyDown={e => { if (e.key === 'Enter') void refresh(); }}
							/>
							<div className='listings__sort'>
								<button 
									className={`listings__sort-btn ${sort === 'created' ? 'is-active' : ''}`} 
									onClick={() => setSort('created')}
								>
									<Trans>Newest</Trans>
								</button>
								<button
									className={`listings__sort-btn ${sort === 'updated' ? 'is-active' : ''}`}
									onClick={() => setSort('updated')}
								>
									<Trans>Updated</Trans>
								</button>
								<button
									className={`listings__sort-btn ${sort === 'downloads' ? 'is-active' : ''}`}
									onClick={() => setSort('downloads')}
								>
									<Trans>Most downloaded</Trans>
								</button>
							</div>
						</div>

						{error && <div className='page__error'>{error}</div>}
						{!list && <p className='page__muted'><Trans>Loading…</Trans></p>}
						{list && list.length === 0 && <p className='page__muted'>
							<Trans>No skins found.</Trans>
						</p>}

						<div className='page__list'>
							{list?.map(a => (
								<div key={a.id} className='listing'>
									<ListingIcon url={skinIconUrl(a.icon)} name={a.name} />
									<div className='listing__main'>
										<div className='listing__name'>
											{a.name}<span className='listing__ver'>v{a.version}</span>
										</div>
										<div className='listing__by'>
											<Trans>by {ph({ author: a.authorName })}</Trans>
											<span className='skin__downloads'>
												{' · '}
												<Plural value={ph({ downloads: a.downloads })} one='# download' other='# downloads' />
											</span>
										</div>
										{a.description && <div className='listing__desc'>{a.description}</div>}
										{a.tags.length > 0 && <div className='listing__tags'>
											{a.tags.map(tag => <span key={tag} className='listing__tag'>{tag}
											</span>)}
										</div>}
									</div>
									<div className='listing__actions'>
										<button
											className='listing-btn' 
											onClick={() => openDetail(a)}>
											<Trans>Details</Trans>
										</button>
										{installButton(a)}
									</div>
								</div>
							))}
						</div>
					</>
				)}

			{confirming && <ConfirmMenu 
				{...confirming} 
				onClose={() => setConfirming(undefined)} 
			/>}
		</>
	);
}
