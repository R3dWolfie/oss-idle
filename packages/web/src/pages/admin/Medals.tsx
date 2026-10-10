import './Medals.css';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import {
	MedalCategories,
	MEDAL_LINES,
	medalById,
	medalLook,
	MEDALS,
} from '@osu-idle/shared/achievements/catalogue';
import { MedalTiers } from '@osu-idle/shared/achievements/medal';
import { MEDAL_XP_BONUS } from '@osu-idle/shared/upgrades';
import {
	medalCategoryName,
	medalDescription,
	medalName,
} from '@osu-idle/shared/display/medals';
import { dateAgo } from '@osu-idle/shared/display/ago';
import { getAdminMedals } from '../../api/admin';
import MedalIcon from '../../components/character/MedalIcon';
import MedalRecapRow from './MedalRecapRow';

/** The full medal recap: what each one is, its rule, who holds and who qualifies. */
export default function Medals() {
	const recap = useAsync(() => getAdminMedals(), []);
	if (!recap) return <main className='admin-medals'><p>Loading…</p></main>;
	const stats = new Map(recap.medals.map(m => [m.id, m]));

	return <main className='admin-medals'>
		<p className='admin-medals__meta'>
			{MEDALS.length} medals · counted over {recap.players} characters who have played,
			{' '}{dateAgo(recap.computedAt)} (cached 10 min) ·{' '}
			{MedalTiers.map(t => `${t} +${MEDAL_XP_BONUS[t] * 100}%`).join(' · ')}
		</p>
		<p className='admin-medals__meta'>
			<b>Held</b>: unlocked already. <b>Qualify</b>: meet the rule now - they get it on
			their next ranked result screen (not counted: the two that depend on the play itself).
		</p>
		{MedalCategories.map(category => <section key={category}>
			<h2>{medalCategoryName(category)}</h2>
			<table>
				<thead><tr>
					<th></th><th>Medal</th><th>Tier</th><th>XP</th><th>Description</th>
					<th>Rule</th><th>Held</th><th>Qualify</th>
				</tr></thead>
				{MEDAL_LINES[category].map(line => <tbody key={line[0]}>
					{line.flatMap(id => {
						const medal = medalById(id);
						const row = stats.get(id);
						if (!medal || !row) return [];
						return [<MedalRecapRow
							key={id}
							icon={<MedalIcon look={medalLook(medal)} />}
							id={id}
							name={medalName(id)}
							tier={medal.tier}
							description={medalDescription(id)}
							rule={row.rule}
							held={row.held}
							qualifying={row.qualifying}
							players={recap.players}
						/>];
					})}
				</tbody>)}
			</table>
		</section>)}
	</main>;
}
