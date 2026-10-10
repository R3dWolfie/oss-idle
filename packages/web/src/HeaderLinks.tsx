import Link from './components/Link';
import OutLink from './components/OutLink';
import { useAdmin } from './hooks/useAdmin';
import { SKILL_SORT } from './components/leaderboard/PlayerSkillLeaderboard';
import { useLingui } from '@lingui/react/macro';
import { GOOD_GRADE } from '@osu-idle/shared/judgement';

type Props = {
	open: boolean;
	onNavigate: () => void;
	showSub: {
		onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
		onMouseLeave: () => void;
	};
};

export default function HeaderLinks({ open, onNavigate, showSub }: Props) {
	const { t } = useLingui();
	const admin = useAdmin();

	return (
		<div
			className={`topbar__links ${open ? 'open' : ''}`}
			onClick={e => (e.target as Element).closest('a') && onNavigate()}
		>
			<div className="topbar__link regular" {...showSub}>
				<Link to='/' className="topbar__link-anchor"><span>{t`home`}</span></Link>
				<div className='topbar__sub'>
					<Link to='/news' className="topbar__sublink"><span>{t`news`}</span></Link>
					<OutLink href='https://osu.ppy.sh' target='_blank' className="topbar__sublink"><span>{t`play osu!`}</span></OutLink>
					<Link to='/download' className="topbar__sublink"><span>{t`play osu!idle`}</span></Link>
				</div>
			</div>

			<div className="topbar__link regular" {...showSub}>
				<Link to='/maps' className="topbar__link-anchor"><span>{t`beatmaps`}</span></Link>
				<div className='topbar__sub'>
					<Link to='/maps' className="topbar__sublink"><span>{t`beatmap listing`}</span></Link>
					<Link to='/maps/requests' className="topbar__sublink"><span>{t`map requests`}</span></Link>
				</div>
			</div>

			<div className="topbar__link regular" {...showSub}>
				<Link to='/rankings/global' search={{ page: 1 }} className="topbar__link-anchor">
					<span>{t`rankings`}</span>
				</Link>
				<div className='topbar__sub'>
					<Link to='/rankings/global' search={{ page: 1 }} className="topbar__sublink">
						<span>{t`global`}</span>
					</Link>
					<Link
						to='/rankings/skills/$skill'
						params={{ skill: SKILL_SORT.overall }}
						search={{ page: 1 }}
						className="topbar__sublink"
					>
						<span>{t`skills`}</span>
					</Link>
					<Link
						to='/rankings/grades/$grade'
						params={{ grade: GOOD_GRADE.X }}
						search={{ page: 1 }}
						className="topbar__sublink"
					>
						<span>{t`grades`}</span>
					</Link>
					<Link to='/rankings/country' search={{ page: 1 }} className="topbar__sublink">
						<span>{t`country`}</span>
					</Link>
					<Link to='/rankings/plays' search={{ page: 1 }} className="topbar__sublink">
						<span>{t`top plays`}</span>
					</Link>
				</div>
			</div>

			<div className="topbar__link regular" {...showSub}>
				<Link to='/help/faq' className="topbar__link-anchor"><span>{t`help`}</span></Link>
				<div className='topbar__sub'>
					<Link to='/help/faq' className="topbar__sublink"><span>{t`faq`}</span></Link>
				</div>
			</div>

			{admin && (
				<div className="topbar__link regular" {...showSub}>
					<Link to='/admin' className="topbar__link-anchor"><span>{t`admin`}</span></Link>
					<div className='topbar__sub'>
						<Link to='/admin/chat' className="topbar__sublink"><span>{t`chat console`}</span></Link>
						<Link to='/admin/balancing' className="topbar__sublink"><span>{t`balancing`}</span></Link>
						<Link to='/admin/nomination' className="topbar__sublink"><span>{t`map nomination`}</span></Link>
						<Link to='/admin/addons' className="topbar__sublink"><span>{t`add-ons`}</span></Link>
						<Link to='/admin/skins' className="topbar__sublink"><span>{t`skins`}</span></Link>
						<Link to='/admin/medals' className="topbar__sublink"><span>{t`medals`}</span></Link>
					</div>
				</div>
			)}
		</div>
	);
}
