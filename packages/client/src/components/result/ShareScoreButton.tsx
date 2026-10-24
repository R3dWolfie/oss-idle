import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { versionLabel } from '@oss-idle/shared/rate';
import { playLabel } from '@oss-idle/shared/mods';
import type { ScoreDTO } from '@oss-idle/shared/score';
import type { ManiaGame } from '@oss-idle/shared/sim/maniaGame';
import type { SkillProgress } from '@oss-idle/shared/sim/bots/character';
import { effectiveLevelOf } from '@oss-idle/shared/sim/skills/levelCurve';
import { LEVEL_COLOUR_MIN } from '@oss-idle/shared/display/levelDisplay';
import { skillName } from '@oss-idle/shared/display/skills';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Entities from '../../entity/entities';
import { music } from '../../audio/MusicPlayer';
import type { Score } from '../../db/schema/score';
import type LightBeatmap from '../../osu/beatmap/LightBeatmap';
import usePlayers from '../multiplayer/usePlayers';
import type { Ranking } from '../multiplayer/useMatchRanking';
import {
	drawScoreCard,
	toPng,
} from './scoreCard';
import SharePreview from './SharePreview';
import { playShutter } from '../../audio/shutter';
import { message } from '../../globals';
import { currentSkin } from '../../osu/skin/Skin';
import { useState } from 'react';

type Props = {
	score: Score | ScoreDTO,
	beatmap?: LightBeatmap,
	game?: ManiaGame,
	gradeImage: string,
	playerName: string,
	playedAt: string,
	judges: { label: string, count: number, color: string }[],
	gains: SkillProgress[],
	failed?: boolean,
	ranking?: Ranking,
};

/** The level a gain reached, as its result screen bar ends on it. */
const levelLabel = (p: SkillProgress, prestige = 0): string => {
	const shown = effectiveLevelOf(p.toLevel, p.toXp, prestige);
	const whole = Math.floor(shown);
	const part = Math.floor((shown - whole) * 100);
	if (whole < LEVEL_COLOUR_MIN || part === 0) return `${whole}`;
	return `${whole}.${String(part).padStart(2, '0')}`;
};

const download = (blob: Blob) => {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = 'oss-idle-score.png';
	link.click();
	URL.revokeObjectURL(link.href);
};

/** The notice ignores a repeat of the same text: clear it first. */
const notice = async (text: string) => {
	await message.set('');
	await message.set(text);
};

let shots = 0;

/** Captures the result screen as an image to share, onto the clipboard. */
export default function ShareScoreButton({ score, beatmap, game, ranking, gains, ...card }: Props) {
	const { t } = useLingui();
	const live = music.beatmap.use((b) => b);
	const map = beatmap ?? live;
	const players = usePlayers();
	const [character] = useSynced(Entities.character);
	const [shot, setShot] = useState<{ id: number, canvas?: HTMLCanvasElement }>();

	const share = async () => {
		const id = ++shots;
		playShutter();
		setShot({ id });
		const meta = map?.set.metadata;
		const drawn = drawScoreCard({
			...card,
			title: meta && `${meta.artist} - ${meta.title}`,
			version: map && versionLabel(map.metadata.version, score.rate),
			creator: meta?.creator,
			background: map?.getBackgroundUri(),
			score: score.score,
			accuracy: score.accuracy,
			maxCombo: score.maxCombo,
			pfc: score.pfc,
			pp: score.pp,
			ur: score.ur,
			rate: score.rate,
			mods: score.mods,
			graphs: game && {
				game, skin: currentSkin.get(),
			},
			gains: gains.map(g => ({
				name: skillName(g.skill),
				level: levelLabel(g, character.skills.find(s => s.name === g.skill)?.prestige.get()),
				levels: g.toLevel - g.fromLevel,
				gained: g.gained,
			})),
			standings: ranking?.results.map(r => ({
				name: r.characterId === ranking.viewed
					? card.playerName
					: players.get(r.characterId)?.name ?? '...',
				score: r.score,
				combo: r.combo,
				accuracy: r.result?.accuracy ?? r.accuracy,
				mods: r.result ? playLabel(r.result.mods, r.result.rate) : '',
				failed: r.failed,
				self: r.characterId === ranking.viewed,
			})),
		});
		const image = drawn.then(toPng);
		// the clipboard needs a secure context: the LAN staging origin saves the file instead
		const canCopy = !!navigator.clipboard && typeof ClipboardItem !== 'undefined';
		const copied = canCopy
			? navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
				.then(() => true, () => false)
			: Promise.resolve(false);
		const canvas = await drawn;
		setShot(current => current?.id === id ? {
			id, canvas, 
		} : current);
		if (await copied) {
			void notice(t`Copied to clipboard`);
			return;
		}
		download(await image);
		void notice(t`Saved as an image`);
	};

	const done = () => setShot(undefined);

	return <>
		<button className="result__exit" onClick={() => void share()}>
			<Trans>SHARE</Trans>
		</button>
		{shot && <SharePreview key={shot.id} canvas={shot.canvas} onDone={done} />}
	</>;
}
