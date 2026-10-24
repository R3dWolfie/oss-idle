import {
	useEffect,
	useRef,
	useState,
} from 'react';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { ManiaGame } from '@oss-idle/shared/sim/maniaGame';
import CharacterBot from '@oss-idle/shared/sim/bots/character';
import { makeOrderedSkills } from '@oss-idle/shared/sim/skills/factory';
import { scrollSpeedToMs } from '@oss-idle/shared/osu/scroll_speed';
import type { Grade } from '@oss-idle/shared/judgement';
import GameplayRenderer from '../gameplay/gameplayRenderer';
const SKILLED = 150;
import { SETTINGS } from '../db/settings';
import { installedSkins } from '../db/schema/skin';
import {
	currentSkin,
	currentSkinDAO,
} from '../osu/skin/Skin';
import {
	importSkin,
	readOsk,
} from '../osu/skin/importSkin';
import { pickFile } from '../pickFile';
import { sizeCanvas } from '../sizeCanvas';
import { skinTestChart } from '../gameplay/skinTestChart';
import { makeGradePlacer } from '../gameplay/gradeBadge';
import '../scenes/Gameplay.css';

/** The current skin playing a generated chart full screen, looping, with a skin picker. */
export default function SkinPlayground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const gradeRef = useRef<HTMLDivElement>(null);
	const [installed] = useSynced(installedSkins);
	const [current] = useSynced(currentSkinDAO);
	const [keys, setKeys] = useState(4);
	const [grade, setGrade] = useState<Grade>('X');
	const [skin] = useSynced(currentSkin);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const ctx = canvas.getContext('2d')!;
		// a strong player: long combos, so the bursts show
		const bot = () => new CharacterBot(makeOrderedSkills(SKILLED));
		const make = () => new ManiaGame(skinTestChart(keys), bot(), { noFail: true });
		let game = make();
		let renderer = new GameplayRenderer(ctx, game, currentSkin.get());
		let start = performance.now();
		let raf = 0;
		const placeGrade = makeGradePlacer();
		const draw = () => {
			let now = performance.now() - start - 1500;
			if (now > game.songEndMs + 1000) {
				game = make();
				start = performance.now();
				now = -1500;
				renderer = new GameplayRenderer(ctx, game, currentSkin.get());
			}
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			const dpr = Math.min(devicePixelRatio, 2);
			if (canvas.width !== Math.round(w * dpr)) sizeCanvas(canvas, ctx, w, h, false);
			game.update(Math.max(0, now));
			renderer.setSkin(currentSkin.get());
			const vp = {
				w, h, scrollMs: scrollSpeedToMs(SETTINGS.scrollspeed.get()),
			};
			renderer.clear(vp);
			placeGrade(gradeRef.current, renderer.draw(now, vp, { onGrade: setGrade }));
			raf = requestAnimationFrame(draw);
		};
		raf = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(raf);
	}, [keys]);

	const importOsk = async () => {
		const file = await pickFile('.osk,.zip');
		if (!file) return;
		const dao = await importSkin(await readOsk(new Uint8Array(await file.arrayBuffer())), file.name);
		await dao.setEnabled(true);
	};

	return (
		<div style={{
			position: 'fixed', inset: 0, background: '#223',
		}}>
			<canvas ref={canvasRef} style={{
				position: 'absolute', inset: 0, width: '100%', height: '100%',
			}} />
			<div ref={gradeRef} className='play__grade'>{skin.grade(grade)}</div>
			<div style={{
				position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 8,
			}}>
				<select
					data-testid='skin-pick'
					value={current?.id ?? ''}
					onChange={e => {
						const dao = installed.find(s => String(s.id) === e.target.value);
						if (dao) void dao.setEnabled(true);
						else void current?.setEnabled(false);
					}}
				>
					<option value=''>Default</option>
					{installed.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
				</select>
				<select value={keys} onChange={e => setKeys(Number(e.target.value))}>
					{[4, 5, 6, 7, 8].map(k => <option key={k} value={k}>{k}K</option>)}
				</select>
				<button onClick={() => void importOsk()}>Import .osk</button>
			</div>
		</div>
	);
}
