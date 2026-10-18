import {
	useEffect,
	useRef,
	useState,
} from 'react';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faPause,
	faPlay,
} from '@fortawesome/free-solid-svg-icons';

/** Plays the map's audio preview, with a bar for how far along it is. */
export default function PreviewButton({ src }: { src: string }) {
	const { t } = useLingui();
	const audio = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);

	useEffect(() => () => audio.current?.pause(), []);

	const toggle = () => {
		const a = audio.current;
		if (!a) return;
		if (a.paused) void a.play();
		else a.pause();
	};

	return <button type='button' className='mapset__preview' onClick={toggle} aria-label={t`preview`}>
		<FontAwesomeIcon icon={playing ? faPause : faPlay} />
		<span className='mapset__preview-bar' style={{ width: `${progress * 100}%` }} />
		<audio
			ref={audio}
			src={src}
			preload='none'
			onPlay={() => setPlaying(true)}
			onPause={() => setPlaying(false)}
			onTimeUpdate={e => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
		/>
	</button>;
}
