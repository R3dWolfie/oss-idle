import Background from '../../scenes/Background';
import Triangles from '../Triangles';
import { useParallax } from '@oss-idle/shared/hooks/useParallax';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { SETTINGS } from '../../db/settings';

/**
 * The scene's own scenery: the beatmap backdrop, the triangles and the scrim.
 * Mounted as an overlay, song select draws none of it - whatever is underneath
 * stays visible, and only the carousel and the queue are on screen.
 */
export default function SongSelectBackdrop() {
	const [parallaxOn] = useSynced(SETTINGS.parallax);
	const parallax = useParallax(0.12, parallaxOn);
	return (<>
		<Background />
		<div
			className="game__bg"
			style={{ transform: `scale(1.06) translate(${parallax.x * 14}px, ${parallax.y * 14}px)` }}
		>
			<Triangles parallax={parallax} count={40} />
		</div>
		<div className="game__scrim" />
	</>);
}
