import './WebBrowser.css';

import {
	useEffect,
	useRef,
	useState,
} from 'react';
import Controls from '../input/Controls';
import {
	isWebOpen,
	webUrl,
} from '../globals';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { useLingui } from '@lingui/react/macro';

/** The page's address as someone else can open it: the desktop app's frame runs
 *  on app://, not on the site. */
const SITE_URL = import.meta.env.VITE_SITE_URL || location.origin;
const shareUrl = (path: string): string => `${SITE_URL}${path}`;

/** The clipboard API needs a secure context (the LAN staging origin isn't one). */
const copy = (text: string): void => {
	if (navigator.clipboard) {
		void navigator.clipboard.writeText(text);
		return;
	}
	const field = document.createElement('textarea');
	field.value = text;
	document.body.append(field);
	field.select();
	document.execCommand('copy');
	field.remove();
};

/**
 * Lazer-style in-game browser: a fullscreen overlay that embeds the osu! web
 * platform (`/web`) in a same-origin iframe with minimal chrome
 * (back / forward / reload, the page's link to share, close).
 *
 * Because the frame is same-origin we can drive its history directly - and,
 * later, the OAuth flow can `postMessage` tokens back to the game across it.
 *
 * Mounted once from App (like VolumeOverlay); hidden via CSS when closed so the
 * frame keeps its state. The iframe is created lazily on first open.
 */
export default function WebBrowser() {
	const { t } = useLingui();

	const [open] = useSynced(isWebOpen);
	const [url] = useSynced(webUrl);
	const frameRef = useRef<HTMLIFrameElement>(null);
	const [mounted, setMounted] = useState(false);
	const [loaded, setLoaded] = useState(false);

	// The site routes in-page (history.pushState), which fires no load event, so
	// the address is read off the frame while it is open.
	const [address, setAddress] = useState('');
	useEffect(() => {
		if (!open) return;
		const read = () => {
			const loc = frameRef.current?.contentWindow?.location;
			if (loc?.pathname.startsWith('/web')) setAddress(shareUrl(loc.pathname + loc.search));
		};
		read();
		const timer = setInterval(read, 500);
		return () => clearInterval(timer);
	}, [open]);

	// Esc closes when the game (not the frame) holds focus.
	Controls.back.usePress(() => { if (isWebOpen.get()) isWebOpen.set(false); });

	// Create the iframe on first open and never tear it down.
	useEffect(() => { if (open) setMounted(true); }, [open]);

	const frameWindow = () => frameRef.current?.contentWindow ?? undefined;
	const close = () => isWebOpen.set(false);

	// The web platform is served under /web. When the embedded page navigates
	// anywhere else (its "play" link does a top-level location change to the game
	// at the origin root), that's our cue to leave: close the overlay instead of
	// booting a second game inside the frame, and send the frame back to the site
	// so it's ready for the next open. Same-origin, so reading location is safe.
	const onFrameLoad = () => {
		const win = frameWindow();
		if (win && !win.location.pathname.startsWith('/web')) {
			close();
			win.location.replace('/web/');
			return; // keep the spinner up; the replace reloads the site
		}
		setLoaded(true);
		// Re-show the spinner the instant the next full navigation starts, so the
		// game never flashes inside the frame while the origin root loads.
		win?.addEventListener('beforeunload', () => setLoaded(false), { once: true });
	};

	return (
		<div className={`web ${open ? 'is-open' : ''}`} aria-hidden={!open}>
			<div className={`web-inner ${loaded ? 'is-loaded' : ''}`} aria-hidden={!open}>
				<div className="web__chrome">
					<button 
						className="web__btn" 
						title={t`Back`} 
						onClick={() => frameWindow()?.history.back()}
					>
						‹
					</button>
					<button
						className="web__btn" 
						title={t`Forward`} 
						onClick={() => frameWindow()?.history.forward()}
					>
						›
					</button>
					<button
						className="web__btn" 
						title={t`Reload`} 
						onClick={() => frameWindow()?.location.reload()}
					>
						⟳
					</button>
					<input
						className="web__address"
						value={address}
						readOnly
						aria-label={t`Page link`}
						onFocus={e => e.currentTarget.select()}
					/>
					<button className="web__btn" title={t`Copy link`} onClick={() => copy(address)}>
						{t`Copy`}
					</button>
					<button 
						className="web__btn web__close"
						title={t`Close (Esc)`}
						onClick={close}
					>
						✕
					</button>
				</div>
				<div className="web__viewport">
					<div className="web__loader" aria-hidden={loaded}>
						<div className="web__loader-spinner" />
					</div>
					{mounted && (
						<iframe
							ref={frameRef}
							className="web__frame"
							src={`/web/${url}`}
							title="osu! web"
							onLoad={onFrameLoad}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
