import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
	medalLook,
	type MedalDef,
} from '@osu-idle/shared/achievements/catalogue';
import {
	medalDescription,
	medalName,
	medalTierName,
} from '@osu-idle/shared/display/medals';
import { dateAgo } from '@osu-idle/shared/display/ago';
import MedalIcon from './MedalIcon';

/** One medal on the profile, lit when held; a hidden one stays a "?" until then. */
export default function ProfileMedal({ medal, unlockedAt }: {
	medal: MedalDef,
	unlockedAt?: number,
}) {
	const locked = unlockedAt === undefined;
	const hidden = locked && medal.category === 'secret';
	return <div className={`profile-medal ${locked ? 'is-locked' : ''}`}>
		{hidden
			? <span className='profile-medal__hidden'>?</span>
			: <MedalIcon look={medalLook(medal)} />}
		<div className='profile-medal__tip'>
			<b>{hidden ? '???' : medalName(medal.id)}</b>
			<span>{medalTierName(medal.tier)}</span>
			<span>{hidden ? <Trans>A hidden medal</Trans> : medalDescription(medal.id)}</span>
			{!locked && <em><Trans>Unlocked {ph({ ago: dateAgo(unlockedAt) })}</Trans></em>}
		</div>
	</div>;
}
