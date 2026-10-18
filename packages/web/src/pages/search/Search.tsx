import './Search.css';
import '../friends/Friends.css';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import { searchPlayers } from '../../api/characters';
import { getAllMaps } from '../../api/maps';
import FriendChip from '../friends/FriendChip';
import MapsetCard from '../../components/MapsetCard';

type Mapset = Awaited<ReturnType<typeof getAllMaps>>[number];

const matches = (mapset: Mapset, words: string[]) => {
	const text = `${mapset.artist} ${mapset.title} ${mapset.creator}`.toLowerCase();
	return words.every(w => text.includes(w));
};

/** Players by name and ranked maps by artist, title or mapper. */
export default function Search({ q }: { q: string }) {
	const { t } = useLingui();
	const navigate = useNavigate();
	const [text, setText] = useState(q);
	const query = q.trim();
	const players = useAsync(() => query ? searchPlayers(query) : [], [query]);
	const mapsets = useAsync(() => getAllMaps(), []);
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	const found = words.length ? mapsets?.filter(m => matches(m, words)) : [];

	return (
		<div className='page-contents search'>
			<label className='search__box'>
				<FontAwesomeIcon icon={faMagnifyingGlass} />
				<input
					autoFocus
					value={text}
					placeholder={t`Search players and beatmaps`}
					onChange={e => {
						setText(e.target.value);
						void navigate({
							to: '/search', search: { q: e.target.value }, replace: true,
						});
					}}
				/>
			</label>
			{query && (<>
				<h2><Trans>Players</Trans> <b>{players?.length ?? '…'}</b></h2>
				<div className='friends__list'>
					{players?.map(p => <FriendChip key={p.userId} friend={p} />)}
				</div>
				<h2><Trans>Beatmaps</Trans> <b>{found?.length ?? '…'}</b></h2>
				<div className='list__beatmap-container'>
					{found?.map(m => <MapsetCard key={m.id} mapset={m} />)}
				</div>
			</>)}
		</div>
	);
}
