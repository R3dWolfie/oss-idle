import './Header.css';

import {
	useEffect,
	useState,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';

import Link from './components/Link';
import OutLink from './components/OutLink';
import { useLingui } from '@lingui/react/macro';
import HeaderLinks from './HeaderLinks';
import HeaderPlayfields from './components/HeaderPlayfields';
import UserMenu from './UserMenu';
import { DISCORD_URL } from '@oss-idle/shared/links';

export default function Header() {
	const { t } = useLingui();

	const [menuVisible, setMenuVisible] = useState(false);
	const [menuHeight, setMenuHeight] = useState<number>();
	const [userMenuActive, setUserMenuActive] = useState(false);
	const [shrunk, setShrunk] = useState(false);
	const [navOpen, setNavOpen] = useState(false);

	// The hover backdrop reaches the bottom of the open submenu; links without one show none.
	const showSub = {
		onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
			const sub = e.currentTarget.querySelector('.topbar__sub');
			const header = e.currentTarget.closest('header');
			if (!sub || !header) return;
			setMenuVisible(true);
			setMenuHeight(sub.getBoundingClientRect().bottom - header.getBoundingClientRect().top + 12);
		},
		onMouseLeave: () => setMenuVisible(false),
	};

	useEffect(() => {
		const handleScroll = () => setShrunk(window.scrollY > 0);
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);


	return (<>
		<div className='topbar__menu-backdrop'><HeaderPlayfields /></div>
		<header>
			<div
				className='topbar__menu'
				data-visibility={menuVisible ? 'visible' : 'hidden'}
				style={menuHeight ? { height: menuHeight } : undefined}
			></div>
			<div className='topbar__menu-background'></div>
			<div className={`topbar ${shrunk ? 'shrunk' : ''}`}>
				<nav className='topbar__group left'>
					<Link to='/' className="topbar__link">
						<div className='topbar__logo-link'>
							<div className="topbar__logo topbar__logo-bg"></div>
							<div className="topbar__logo"></div>
						</div>
					</Link>

					<HeaderLinks open={navOpen} onNavigate={() => setNavOpen(false)} showSub={showSub} />
				</nav>
				<div className='topbar__group right'>
					<button
						type='button'
						className={`topbar__burger link-icon ${navOpen ? 'active' : ''}`}
						aria-label={t`menu`}
						aria-expanded={navOpen}
						onClick={() => {
							setNavOpen(!navOpen);
							setUserMenuActive(false);
						}}
					>
						<FontAwesomeIcon icon={faBars} />
					</button>
					<div className='topbar__link'>
						<OutLink href={DISCORD_URL} className='link-icon link-discord' target="_blank">
							<FontAwesomeIcon icon={faDiscord} />
						</OutLink>
					</div>
					<div className='topbar__link'>
						<Link to='/search' search={{ q: '' }} className='link-icon' title={t`search`}>
							<FontAwesomeIcon icon={faMagnifyingGlass} />
						</Link>
					</div>
					<div className='topbar__link'>
						<Link to='/store' className='link-icon' title={t`support the game`}>
							<FontAwesomeIcon icon={faHeart} />
						</Link>
					</div>
					<div className='topbar__link for-avatar'>
						<UserMenu open={userMenuActive} onOpenChange={setUserMenuActive} onOpen={() => setNavOpen(false)} />
					</div>
				</div>
			</div>
		</header>
	</>);
}
