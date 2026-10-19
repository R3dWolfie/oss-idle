import type { ReactNode } from 'react';
import type { MedalTier } from '@oss-idle/shared/achievements/medal';
import { MEDAL_XP_BONUS } from '@oss-idle/shared/upgrades';

type Props = {
	icon: ReactNode,
	id: string,
	name: string,
	tier: MedalTier,
	description: string,
	rule: string,
	held: number,
	qualifying: number,
	players: number,
};

const share = (n: number, of: number) => of ? ` (${Math.round(n / of * 100)}%)` : '';

/** One medal in the admin recap. */
export default function MedalRecapRow({
	icon, id, name, tier, description, rule, held, qualifying, players,
}: Props) {
	return <tr className={`admin-medals__row tier-${tier}`}>
		<td className='admin-medals__icon'>{icon}</td>
		<td><b>{name}</b><code>{id}</code></td>
		<td className='admin-medals__tier'>{tier}</td>
		<td>+{MEDAL_XP_BONUS[tier] * 100}%</td>
		<td>{description}</td>
		<td className='admin-medals__rule'>{rule}</td>
		<td className='admin-medals__num'>{held}</td>
		<td className='admin-medals__num'>{qualifying}{share(qualifying, players)}</td>
	</tr>;
}
