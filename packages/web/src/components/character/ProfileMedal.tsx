import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
	medalLook,
	type MedalDef,
} from '@osu-idle/shared/achievements/catalogue';
import {
	medalCategoryName,
	medalDescription,
	medalName,
	medalTierName,
} from '@osu-idle/shared/display/medals';
import MedalIcon from './MedalIcon';
import MedalProgressBar from './MedalProgressBar';

const share = new Intl.NumberFormat(undefined, {
	style: 'percent', maximumSignificantDigits: 3,
});
const day = new Intl.DateTimeFormat(undefined, {
	day: 'numeric', month: 'short', year: 'numeric',
});

/** One medal on the profile, lit when held; a hidden one stays a "?" until then. */
export default function ProfileMedal({ medal, unlockedAt, progress, holders, players }: {
	medal: MedalDef,
	unlockedAt?: number,
	progress?: { value: number, current: number, goal: number },
	holders: number,
	players: number,
}) {
	const locked = unlockedAt === undefined;
	const hidden = locked && medal.category === 'secret';
	const icon = hidden
		? <span className='profile-medal__hidden'>?</span>
		: <MedalIcon look={medalLook(medal)} />;
	return <div className={`profile-medal ${locked ? 'is-locked' : ''}`}>
		{icon}
		<div className='profile-medal__tip'>
			<div className='profile-medal__group'>
				<Trans>{ph({ category: medalCategoryName(medal.category) })} ({ph({ tier: medalTierName(medal.tier) })})</Trans>
			</div>
			<div className='profile-medal__main'>
				<div className='profile-medal__big'>{icon}</div>
				<div className='profile-medal__name'>{hidden ? '???' : medalName(medal.id)}</div>
				<div className='profile-medal__desc'>
					{hidden ? <Trans>A hidden medal</Trans> : medalDescription(medal.id)}
				</div>
			</div>
			<div className='profile-medal__foot'>
				<div className='profile-medal__rarity'>
					<Trans>{ph({ holders: holders.toLocaleString() })} players ({ph({ share: share.format(players ? holders / players : 0) })})</Trans>
				</div>
				{locked && progress && <MedalProgressBar {...progress} />}
				{!locked && <div className='profile-medal__date'>
					<Trans>Achieved on {ph({ date: day.format(unlockedAt) })}</Trans>
				</div>}
			</div>
		</div>
	</div>;
}
