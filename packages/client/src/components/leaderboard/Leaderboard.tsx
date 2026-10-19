import './Leaderboard.css';
import {
	useEffect,
	useState,
} from 'react';
import { Score } from '../../db/schema/score';
import ScoreEntry from './ScoreEntry';
import PersonalBest from './PersonalBest';
import { music } from '../../audio/MusicPlayer';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { ScoreDTO } from '@oss-idle/shared/score';
import { countryName } from '@oss-idle/shared/display/country';
import {
	getBeatmapScores,
	type BoardPlayer,
} from '../../online/services/scores';
import {
	SCORE_TAB,
	ScoreTab,
	SETTINGS,
} from '../../db/settings';
import Account from '../../online/account';
import Dropdown, { DropdownOption } from '../dropdown/Dropdown';
import { i18n } from '../../i18n';
import { Trans } from '@lingui/react/macro';

/**
 * Score leaderboard for the currently-selected difficulty. The category is
 * switchable between Local (from SQLite), Global, and Country (the signed-in
 * player's own country - only offered while signed in).
 */
export default function Leaderboard() {
	const [beatmap] = useSynced(music.beatmap);
	const [account] = useSynced(Account.character);
	const [category] = useSynced(SETTINGS.leaderboard);
	const [scores, setScores] = useState<{ score: Score | ScoreDTO, player?: BoardPlayer }[]>([]);
	const [loading, setLoading] = useState(false);

	const country = account?.country;

	// The Country tab needs a signed-in country; fall back to Global without it.
	const invalidCountryTab = category === SCORE_TAB.COUNTRY && !country;
	const effective = invalidCountryTab ? SCORE_TAB.GLOBAL : category;

	const options: DropdownOption<ScoreTab>[] = [
		{
			value: SCORE_TAB.LOCAL, label: 'Local', 
		},
		{
			value: SCORE_TAB.GLOBAL, label: 'Global', 
		},
		...(country ? [{
			value: SCORE_TAB.COUNTRY, 
			label: countryName(country, i18n.locale), 
		}] : []),
	];

	useEffect(() => {
		if (!beatmap) return;

		const id = beatmap.metadata.id;
		if (id === undefined) {
			setScores([]);
			return;
		}
		let cancelled = false;
		setLoading(true);

		const fetch = effective === SCORE_TAB.LOCAL
			? Score.forBeatmap(id).then(local => local.map(score => ({ score })))
			: getBeatmapScores(id, effective === SCORE_TAB.COUNTRY ? country : undefined);

		fetch
			.then((s) => !cancelled && setScores(s))
			.catch(() => !cancelled && setScores([]))
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [beatmap, effective, country]);

	return (
		<aside className="lb">
			<Dropdown 
				className="lb__select" 
				value={SETTINGS.leaderboard} 
				options={options} 
			/>

			<div className="lb__body">
				{beatmap === undefined ? (
					<p className="lb__empty">
						<Trans>Select a difficulty to see its scores.</Trans>
					</p>
				) : loading ? (
					<p className="lb__empty">
						<Trans>Loading…</Trans>
					</p>
				) : scores.length === 0 ? (
					<p className="lb__empty">
						<Trans>No scores yet, be the first!</Trans>
					</p>
				) : (
					<ol className="lb__list">
						{scores.map(({ score, player }, i) => (
							<ScoreEntry
								key={score.id}
								score={score}
								player={player}
								rank={i + 1}
								previous={scores[i + 1]?.score}
							/>
						))}
					</ol>
				)}
			</div>

			{effective !== SCORE_TAB.LOCAL && beatmap?.metadata.id !== undefined && (
				<PersonalBest 
					beatmapId={beatmap.metadata.id} 
					country={effective === SCORE_TAB.COUNTRY ? country : undefined} 
				/>
			)}
		</aside>
	);
}
