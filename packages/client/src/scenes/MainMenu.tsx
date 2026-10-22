import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import IdleLogo from '../components/IdleLogo';
import LogoVisualizer from '../components/LogoVisualizer';
import {
	music,
	PLAYER_MODE,
} from '../audio/MusicPlayer';
import './MainMenu.css';
import Background from './Background';
import Multiplayer from '../online/multiplayer';
import SceneManager, { SCENE } from './SceneManager';
import Device from '../responsive/Device';
import { useParallax } from '@oss-idle/shared/hooks/useParallax';
import Announce from '../components/Announce';
import {
	mapped,
	ValueIn,
} from '@oss-idle/shared/helpers/mapped';
import { useLingui } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import Controls from '../input/Controls';
import normalize from '@oss-idle/shared/math/normalize';
import {
	isOptionsOpen,
	menuIdle,
} from '../globals';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Entities from '../entity/entities';
import { SETTINGS } from '../db/settings';
import { VERSION } from '@oss-idle/shared/version';
import DesktopUpdate from '../components/DesktopUpdate';
import SupporterHeart from '../components/SupporterHeart';
import Changelog from '../components/Changelog';
import DirectTab from '../components/direct/DirectTab';
import { currentSkin } from '../osu/skin/Skin';
import Auth from '../online/auth';
import ContextMenu from '../components/ContextMenu';
import ConfirmMenu from '../components/ConfirmMenu';
import PlayManager from '../online/playManager';
import useAwayHours from './useAwayHours';
import Socket from '../online/socket';
import { checkAwayMedals } from '../online/medalWatch';
import { desktop } from '@oss-idle/shared/desktop';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons/faDiscord';
import { DISCORD_URL } from '@oss-idle/shared/links';
import { pickOsz } from '../osu/beatmap/oszImport';
import { pickFile } from '../pickFile';
import { createSet } from '../editor/save';
import { message } from '../globals';
import LightBeatmapSet from '../osu/beatmap/LightBeatmapSet';

interface Props {
	/** play the white-flash "drop" entrance (true when arriving from the intro) */
	flash?: boolean
}

const MENU = mapped(['CLOSED', 'OPEN', 'PLAY', 'EDIT']);
type Menu = ValueIn<typeof MENU>;

const OPTION = mapped([
	'PLAY',
	'EDITOR',
	'OPTIONS', 
	'EXIT', 
	'SOLO',
	'MULTI',
	'BACK',
	'EDIT_SELECT',
	'EDIT_IMPORT',
	'EDIT_NEW',
	'EDIT_BACK',
]);
type Option = ValueIn<typeof OPTION>;

type OptionDisplay = {
	menu: Menu,
	title: string,
	band: 'out' | 'mid',
	flip: boolean,
	order: number,
	disabled?: true,
	onSelect: () => void,
};

export default function MainMenu({ flash = false }: Props) {
	music.mode.set(PLAYER_MODE.PLAYLIST);

	const closeTimeout = 30000;
	const { t } = useLingui();
	const [menu, setMenu] = useState<Menu>(MENU.CLOSED);
	const [exitConfirm, setExitConfirm] = useState(false);
	const [multiConfirm, setMultiConfirm] = useState(false);
	const [parallaxOn] = useSynced(SETTINGS.parallax);
	const parallax = useParallax(0.08, parallaxOn);
	const [character] = useSynced(Entities.character);
	const [skin] = useSynced(currentSkin);
	const [user] = useSynced(Auth.user);
	const [idle] = useSynced(menuIdle);
	// oss!direct waits for the menu's first opening after the intro
	const [opened, setOpened] = useState(!flash);
	const idleTimer = useRef<number>(undefined);
	const awayHours = useAwayHours();

	const getLogoSize = () => Math.min(window.innerHeight * 0.5, window.innerWidth * 0.75);

	const [logoSize, setLogoSize] = useState(getLogoSize());
	useEffect(() => Device.resize.on(() => setLogoSize(getLogoSize())), []);
	const [connected] = useSynced(Socket.connected);
	useEffect(() => {
		if (connected && user) checkAwayMedals();
	}, [connected, user]);

	useEffect(() => {
		const arm = () => {
			clearTimeout(idleTimer.current);
			idleTimer.current = window.setTimeout(() => {
				setMenu(MENU.CLOSED);
				void menuIdle.set(true);
			}, closeTimeout);
		};
		const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
		events.forEach(e => window.addEventListener(e, arm));
		arm();
		return () => {
			clearTimeout(idleTimer.current);
			events.forEach(e => window.removeEventListener(e, arm));
			void menuIdle.set(false);
		};
	}, []);

	useEffect(() => {
		if (menu === MENU.CLOSED) return;
		setOpened(true);
		void menuIdle.set(false);
	}, [menu]);

	const mainClick = useCallback(() => {
		switch(menu) {
			case MENU.CLOSED:
				setMenu(MENU.OPEN);
				break;
			case MENU.OPEN:
				setMenu(MENU.PLAY);
				break;
			case MENU.PLAY:
				toSongSelect();
				break;
			case MENU.EDIT:
				toEditSelect();
				break;
		}
	}, [menu]);

	const toSongSelect = () => SceneManager.set(SCENE.SELECT);

	const toEditSelect = () => SceneManager.set(SCENE.SELECT, 'edit');

	/** Import an .osz, then open song select to edit, on the imported map. */
	const importToEdit = async () => {
		const set = await pickOsz();
		if (!set) return;
		const [easiest] = LightBeatmapSet.fromMetadata(set.metadata).getPlayableBeatmaps()
			.sort((a, b) => a.metadata.difficulty - b.metadata.difficulty);
		if (easiest) await music.beatmap.set(easiest);
		await SETTINGS.search.set('');
		toEditSelect();
	};

	/** Start a map on an audio file, straight into the editor. */
	const newMap = async () => {
		const audio = await pickFile('audio/*,.mp3,.ogg,.wav');
		if (!audio) return;
		try {
			const beatmap = await createSet(audio, {
				creator: user?.username ?? character.name,
				version: t`New difficulty`,
				keys: 4,
			});
			SceneManager.set(SCENE.EDITOR, beatmap);
		} catch (e) {
			console.error('[editor] new map failed', e);
			message.set(t`Could not start a map on ${ph({ name: audio.name })}`);
		}
	};

	// Exit only works in the desktop app; the browser forbids closing its own tab.
	const isDesktop = !!desktop();
	const exit = () => desktop()?.quit();

	const back = useCallback(() => {
		switch(menu) {
			case MENU.CLOSED:
				// TODO: exit
				break;
			case MENU.OPEN:
				setMenu(MENU.CLOSED);
				break;
			case MENU.PLAY:
			case MENU.EDIT:
				setMenu(MENU.OPEN);
				break;
		}
	}, [menu]);

	Controls.back.usePress(back);

	const OPTION_DISPLAY: Record<Option, OptionDisplay> = {
	// Main menu
		[OPTION.PLAY]: {
			menu: MENU.OPEN,
			title: t`Play`,
			band: 'out',
			flip: false,
			order: 1,
			onSelect: () => setMenu(MENU.PLAY),
		},
		[OPTION.EDITOR]: {
			menu: MENU.OPEN,
			title: t`Editor`,
			band: 'mid',
			flip: false,
			order: 2,
			onSelect: () => setMenu(MENU.EDIT),
		},
		[OPTION.OPTIONS]: {
			menu: MENU.OPEN,
			title: t`Options`,
			band: 'mid',
			flip: true,
			order: 3,
			onSelect: () => { isOptionsOpen.set(!isOptionsOpen.get()); },
		},
		[OPTION.EXIT]: {
			menu: MENU.OPEN,
			title: t`Exit`,
			band: 'out',
			flip: true,
			order: 4,
			disabled: isDesktop ? undefined : true,
			onSelect: () => { if (isDesktop) setExitConfirm(true); },
		},

		// Play menu
		[OPTION.SOLO]: {
			menu: MENU.PLAY,
			title: t`Solo`,
			band: 'out',
			flip: false,
			order: 1,
			onSelect: toSongSelect,
		},
		[OPTION.MULTI]: {
			menu: MENU.PLAY,
			title: t`Multi`,
			band: 'mid',
			flip: false,
			disabled: character.isGuest() ? true : undefined,
			order: 2,
			onSelect: () => {
				if (character.isGuest()) return;
				if (Multiplayer.current.get()) SceneManager.set(SCENE.MATCH);
				else if (PlayManager.live.get()) setMultiConfirm(true);
				else SceneManager.set(SCENE.LOBBY);
			},
		},
		[OPTION.BACK]: {
			menu: MENU.PLAY,
			title: t`Back`,
			band: 'out',
			flip: true,
			order: 3,
			onSelect: () => setMenu(MENU.OPEN),
		},

		// Editor menu
		[OPTION.EDIT_SELECT]: {
			menu: MENU.EDIT,
			title: t`Select`,
			band: 'out',
			flip: false,
			order: 1,
			onSelect: toEditSelect,
		},
		[OPTION.EDIT_IMPORT]: {
			menu: MENU.EDIT,
			title: t`Import`,
			band: 'mid',
			flip: false,
			order: 2,
			onSelect: () => void importToEdit(),
		},
		[OPTION.EDIT_NEW]: {
			menu: MENU.EDIT,
			title: t`New`,
			band: 'mid',
			flip: true,
			order: 3,
			onSelect: () => void newMap(),
		},
		[OPTION.EDIT_BACK]: {
			menu: MENU.EDIT,
			title: t`Back`,
			band: 'out',
			flip: true,
			order: 4,
			onSelect: () => setMenu(MENU.OPEN),
		},
	};

	// foreground content drifts opposite the background for depth
	const fgX = -parallax.x * 18;
	const fgY = -parallax.y * 18;

	const mobileShift = 1 - normalize(window.innerWidth, [400, 850]);

	return (
		<div
			className={`menu ${flash ? 'menu--flash' : ''} ${menu === MENU.CLOSED ? '' : 'menu--open'}`}
			data-fresh={!opened}
			data-idle={idle}
		>
			<Background image={user?.supporter ? skin.data.menu.background : undefined} />
			<div className="menu__vignette" />

			<div className="menu__brand">
				<span className="menu__brand-name">oss!</span>
				<span className="menu__brand-tag">idle</span>
				<span className="menu__brand-version">v{VERSION}</span>
				<a
					className="menu__discord"
					href={DISCORD_URL}
					target="_blank"
					rel="noreferrer"
					aria-label="Discord"
				>
					<FontAwesomeIcon icon={faDiscord} />
				</a>
				<Changelog />
			</div>

			<SupporterHeart />
			<DirectTab />

			<div className="menu__center" style={{ transform: `translate(${fgX}px, ${fgY}px)` }}>
				<div className='menu__logo-options' style={{
					height: `${logoSize}px`,
					width: `${logoSize}px`,
					transform: `translate(${menu === MENU.CLOSED ? 'calc(-50%)' : `calc(-50% + ${Math.floor(logoSize / 2) - (mobileShift * logoSize / 2)}px)`}, -50%)`,
				}}>
					{Object.entries(Object.values(OPTION_DISPLAY)
						.sort((a, b) => a.order - b.order)
						.reduce((acc, option) => {
							if (!acc[option.menu]) acc[option.menu] = [];
							acc[option.menu].push(option);
							return acc;
						}, {} as Record<Menu, OptionDisplay[]>))
						.map(([currentMenu, group]) => (
							<div
								key={currentMenu}
								className={`menu__option_group ${menu === currentMenu ? 'visible' : ''}`}
								style={{ width: `${logoSize * 1.2}px` }}
							>
								{group.map(option => <div
									key={option.title}
									className={
										`menu__option ${option.band} ${menu === option.menu ? 'visible' : ''} ${option.flip ? 'flip' : ''} ${option.disabled ? 'disabled' : ''}`
									}
									onClick={option.onSelect}
								>
									<div className='menu__option_bg_safe'>
										<div 
											className='menu__option_bg' 
											style={{ backgroundImage: `url('/band_${option.band}.png')` }}
										>
										</div>
									</div>
									<div className='menu__option_bg_safe on'>
										<div 
											className='menu__option_bg' 
											style={{ backgroundImage: `url('/band_${option.band}_on.png')` }}
										>
										</div>
									</div>
									<div className='menu_option_contents'>
										{option.title}
									</div>
								</div>)}
							</div>
						))}
				</div>
				<div 
					className="menu__logo-menu" 
					style={{
						transform: `translateX(${menu === MENU.CLOSED ? 
							'0px' 
							: `-${(logoSize / 2) + (mobileShift * logoSize / 2)}px`})`,
					}}
				>
					<div className="menu__logo-enter">
						<LogoVisualizer size={logoSize} />
						<IdleLogo size={logoSize} onClick={mainClick} />
					</div>
				</div>
			</div>

			<Announce />
			<DesktopUpdate />

			{exitConfirm && (
				<ContextMenu
					title={t`Exit oss!idle`}
					sub={awayHours === undefined
						? t`Are you sure you want to quit?`
						: t`Your character keeps playing its queue for ${ph({ hours: awayHours })} hours after you quit.`}
					onClose={() => setExitConfirm(false)}
					options={[
						{
							label: t`Exit`, color: '#e93100', onClick: exit, 
						},
						{
							label: t`Cancel`, color: '#6b6b6b', onClick: () => setExitConfirm(false), 
						},
					]}
				/>
			)}

			{multiConfirm && (
				<ConfirmMenu
					title={t`A play is running`}
					sub={t`Abort it to play multiplayer?`}
					confirmLabel={t`Abort`}
					onConfirm={() => void PlayManager.abort().then(() => SceneManager.set(SCENE.LOBBY))}
					onClose={() => setMultiConfirm(false)}
				/>
			)}

			{flash && <div className="menu__flash" />}
		</div>
	);
}
