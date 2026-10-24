import { ph } from '@lingui/core/macro';
import './MapRequests.css';
import './MapClaims.css';

import {
	useEffect,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import Link from '../../components/Link';
import OutLink from '../../components/OutLink';
import {
	getMapClaims,
	saveMapClaims,
} from '../../api/mapRequests';
import { useCurrentUser } from '../../hooks/useCurrentUser';

type ClaimList = Awaited<ReturnType<typeof getMapClaims>>;

/** Temporary: players pick the ranked maps they proposed on Discord, for an admin to attribute. */
export default function MapClaims() {
	const { t } = useLingui();
	const user = useCurrentUser();
	const [list, setList] = useState<ClaimList>();
	const [picked, setPicked] = useState(new Set<number>());
	const [search, setSearch] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		if (!user) return;
		getMapClaims()
			.then(data => {
				setList(data);
				setPicked(new Set(data.mine));
			})
			.catch(e => setError(String((e as Error).message ?? e)));
	}, [user]);

	const toggle = (setId: number) => setPicked(prev => {
		const next = new Set(prev);
		if (!next.delete(setId)) next.add(setId);
		return next;
	});

	const save = async () => {
		setBusy(true);
		setError(undefined);
		try {
			const { setIds } = await saveMapClaims([...picked]);
			setPicked(new Set(setIds));
			setMessage(t`Saved. An admin will check your claims.`);
		} catch (e) {
			setError(String((e as Error).message ?? e));
		} finally {
			setBusy(false);
		}
	};

	const needle = search.trim().toLowerCase();
	const shown = (list?.maps ?? []).filter(map => !needle
		|| `${map.artist} ${map.title} ${map.creator}`.toLowerCase().includes(needle));

	return (
		<main>
			<div className='page-contents'>
				<p className='requests__intro'>
					<Trans>
						Proposed maps for ranking on Discord? Tick the ones you proposed and save,
						and they will count for your curator medals once an admin confirms.
					</Trans>
				</p>

				{!user && <p className='requests__signed-out'>
					<Trans><Link to='/login'>Sign in</Link> to claim your maps.</Trans>
				</p>}

				{error && <p className='requests__error'>{error}</p>}

				{list && <>
					<div className='request-form__row'>
						<input
							className='request-form__input'
							value={search}
							placeholder={t`Filter by artist, title or mapper`}
							onChange={e => setSearch(e.target.value)}
						/>
						<button
							className='request-form__submit'
							disabled={busy}
							onClick={() => void save()}
						>
							<Trans>Save ({ph({ count: picked.size })})</Trans>
						</button>
					</div>
					{message && <p className='requests__muted'>{message}</p>}

					<div className='claims__list'>
						{shown.map(map => (
							<label key={map.setId} className='claims__row'>
								<input
									type='checkbox'
									checked={picked.has(map.setId)}
									onChange={() => toggle(map.setId)}
								/>
								<span>{map.artist} - {map.title}</span>
								<span className='requests__muted'>{map.creator}</span>
								<OutLink
									className='claims__link'
									href={`https://osu.ppy.sh/beatmapsets/${map.osuId}`}
									target='_blank'
								>
									osu!
								</OutLink>
							</label>
						))}
					</div>
				</>}
			</div>
		</main>
	);
}
