import {
	useEffect,
	useRef,
} from 'react';
import type { ManiaGame } from '@oss-idle/shared/sim/maniaGame';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { currentSkin } from '../osu/skin/Skin';
import { sizeCanvas } from '../sizeCanvas';
import { drawHpGraph } from './drawHpGraph';

/**
 * Result-screen canvas plotting HP over the course of the song: green, red
 * below the live HP bar's low threshold.
 */
export default function HpGraph({
	game,
	height = 190,
}: {
	game: ManiaGame,
	height?: number
}) {
	const [skin] = useSynced(currentSkin);
	const ref = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const canvas = ref.current!;
		const ctx = canvas.getContext('2d')!;
		const draw = () => {
			const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 300;
			sizeCanvas(canvas, ctx, width, height, false);
			canvas.style.height = `${height}px`;
			drawHpGraph(ctx, {
				hits: game.hits,
				songEndMs: game.songEndMs,
				width,
				height,
				lowThreshold: skin.data.hpBar.lowThreshold,
			});
		};
		draw();
		const ro = new ResizeObserver(draw);
		ro.observe(canvas);
		return () => ro.disconnect();
	}, [game, height, skin]);

	return <canvas ref={ref} className="play__graph" />;
}
