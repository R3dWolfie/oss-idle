import './Header.css';

import {
	useEffect,
	useRef,
	useState,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars';

import Link from './components/Link';
import OutLink from './components/OutLink';
import { Asset } from './router';
import { useCurrentUser } from './hooks/useCurrentUser';
import { useCurrentCharacter } from './hooks/useCurrentCharacter';
import { GUEST_AVATAR_URL } from '@osu-idle/shared/osu/profile';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import HeaderLinks from './HeaderLinks';

export default function Header() {
	const { t } = useLingui();

	const user = useCurrentUser();
	const character = useCurrentCharacter();
	const userMenu = useRef<HTMLDivElement>(null);
	const [menuVisible, setMenuVisible] = useState(false);
	const [menuHeight, setMenuHeight] = useState<number>();
	const [userMenuActive, setUserMenuActive] = useState(false);
	const [shrunk, setShrunk] = useState(false);
	const [navOpen, setNavOpen] = useState(false);

	// Grow the hover backdrop to reach the bottom of whichever submenu is open,
	// so it always fits the content (no more hardcoded pixel height).
	const showSub = {
		onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
			setMenuVisible(true);
			const sub = e.currentTarget.querySelector('.topbar__sub');
			const header = e.currentTarget.closest('header');
			if (sub && header) {
				const top = header.getBoundingClientRect().top;
				setMenuHeight(sub.getBoundingClientRect().bottom - top + 12);
			}
		},
		onMouseLeave: () => setMenuVisible(false),
	};

	useEffect(() => {
		const handleScroll = () => setShrunk(window.scrollY > 0);
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		const handleClickOutside = (event: PointerEvent) => {
			const target = event.target;
			if (!userMenu.current || !(target instanceof Node)) return;
			if (userMenu.current.contains(target)) return;
			setUserMenuActive(false);
		};

		document.addEventListener('pointerdown', handleClickOutside, true);

		return () => {
			document.removeEventListener('pointerdown', handleClickOutside);
		};
	}, []);

	return (<>
		<div className='topbar__menu-backdrop'></div>
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
						<OutLink href="https://discord.gg/Yd5GEaX8AJ" className='link-icon link-discord' target="_blank">
							<FontAwesomeIcon icon={faDiscord} />
						</OutLink>
					</div>
					<div className='topbar__link for-avatar'>
						<div
							ref={userMenu}
							className={`topbar__avatar ${userMenuActive ? 'active' : ''}`}
							style={{ backgroundImage: `url(${Asset(user?.avatarUrl ? user.avatarUrl : GUEST_AVATAR_URL)})` }}
							onClick={(e) => {
								setNavOpen(false);
								setUserMenuActive(e.target === userMenu.current ? !userMenuActive : true);
							}}
						>
							{userMenuActive && (
								<div className='usermenu'>
									<div className='usermenu_profile'>{user?.username ?? 'Guest'}</div>
									<div className='usermenu_links'>
										{user && (<>
											{character && <Link to='/c/$id' params={{ id: String(character.id) }} className="usermenu__link">
												<Trans>My Profile</Trans>
											</Link>}
											<Link to='/friends' className="usermenu__link"><Trans>Friends</Trans></Link>
											<Link to='/settings' className="usermenu__link"><Trans>Settings</Trans></Link>
											<Link to='/logout' className="usermenu__link"><Trans>Sign out</Trans></Link>
										</>)}
										{!user && (<>
											<Link to='/login' className="usermenu__link"><Trans>Sign in</Trans></Link>
										</>)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</header>
	</>);
}
