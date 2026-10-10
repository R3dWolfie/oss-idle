import type { SkillProgress } from '@osu-idle/shared/sim/bots/character';
import type { ReactNode } from 'react';
import SkillXPBar from '../components/SkillXPBar';
import SkillProgression from '../components/result/SkillProgression';
import XpMultiplierToggle from '../components/songselect/XpMultiplierToggle';
import UpgradeRow from '../components/upgrades/UpgradeRow';
import ConfirmMenu from '../components/ConfirmMenu';
import DockPanel from '../components/dock/DockPanel';
import DockPill from '../components/dock/DockPill';
import PlayQueue from '../gameplay/playQueue';
import SongSelect from '../scenes/SongSelect';
import PlayDock from '../components/dock/PlayDock';
import SceneManager, { SCENE } from '../scenes/SceneManager';
import { openPage } from '../globals';
import PlayManager from '../online/playManager';
import Multiplayer from '../online/multiplayer';
import Entities from '../entity/entities';
import Lobby from '../scenes/Lobby';
import MatchSetup from '../scenes/MatchSetup';
import Result from '../scenes/Result';
import { Judgements } from '@osu-idle/shared/judgement';
import type { JudgementCounts } from '@osu-idle/shared/score';
import type { Match } from '@osu-idle/shared/multiplayer';
import LightBeatmap from '../osu/beatmap/LightBeatmap';
import { makeOrderedSkills } from '@osu-idle/shared/sim/skills/factory';
import Skill from '@osu-idle/shared/sim/skills/skill';
import MedalUnlockOverlay from '../components/medals/MedalUnlockOverlay';
import MedalCatalogue from './MedalCatalogue';
import type { MedalUnlock } from '../achievements/medalUnlocks';
import {
	MEDALS_BACKFILL,
	MEDALS_FIVE,
	MEDALS_ONE,
	MEDALS_THREE,
} from './medalSamples';

const gain = (
	skill: string,
	fromLevel: number,
	toLevel: number,
	gained: number,
	toFill = 0,
): SkillProgress => ({
	skill,
	gained,
	fromLevel,
	fromXp: 0,
	toLevel,
	toXp: toFill * Skill.xpForLevel(toLevel),
	levels: toLevel - fromLevel,
} as SkillProgress);

const spread = (count: number, levels: number): SkillProgress[] =>
	['accuracy', 'speed', 'stamina', 'jackspeed', 'coordination', 'release', 'reading',
		'consistency', 'concentration', 'speedjam', 'memory']
		.slice(0, count)
		.map((s, i) => gain(s, 0, Math.max(1, levels - i * 2), 1000 * (count - i)));

/** A queue of maps that were never downloaded - enough for the dock and the
 *  rail to render, which is all these cases need. */
const fakeQueue = () => {
	const entry = (artist: string, title: string, version: string, id: number) => ({
		metadata: {
			id, version, runtime: true, total_length: 180_000,
		},
		set: {
			metadata: {
				artist, title, 
			}, 
		},
	} as unknown as LightBeatmap);

	const entries = [
		entry('Camellia', 'Ghost', 'Rewind', 1),
		entry('Nekomata Master', 'Far east nightbird', 'Lunatic', 2),
		entry('xi', 'Blue Zenith', 'FOUR DIMENSIONS', 3),
		entry('Yooh', 'Fly Away', 'Insane', 4),
	];
	PlayQueue.start('Playlist', entries, 0);
	void PlayManager.live.set({
		token: 'playground',
		beatmap: entries[0],
		startedAt: Date.now() - 70_000,
		endsAt: Date.now() + 110_000,
		accuracy: 0.9842,
		grade: 'S',
	});
	return entries;
};

type PlaygroundCase = {
	id: string,
	label: string,
	/** app state the case needs, applied before it renders - setting a Synced
	 *  from render updates whoever is subscribed to it mid-render, which React
	 *  refuses */
	setup?: () => void,
	render: () => ReactNode,
};

/** An accuracy skill deep enough to show a gear tier and its overdrive. Its
 *  Synceds are its own, so seeding them in render reaches nobody else. */
const tieredSkill = () => {
	const skill = makeOrderedSkills().find(s => s.name === 'accuracy')!;
	void skill.level.set(101);
	void skill.xp.set(Skill.xpForLevel(101) * 0.35);   // decimals visible
	void skill.upgrades.set(10);
	void skill.overdrive.set(4.2);
	void skill.prestige.set(1);
	return skill;
};

/** The whole unlock overlay over an empty stage. */
const medalCase = (id: string, label: string, medals: () => MedalUnlock[]): PlaygroundCase => ({
	id,
	label,
	render: () => <MedalUnlockOverlay medals={medals()} />,
});

/** A host alone in an 8-player room, the way a new match starts. */
const fakeMatch = (): Match => {
	const me = Entities.character.get().id;
	return {
		id: 1,
		name: `${Entities.character.get().name}'s game`,
		locked: false,
		hostId: me,
		changingBeatmap: false,
		playing: false,
		slots: Array.from({ length: 16 }, (_, i) => i === 0
			? {
				state: 'player', characterId: me, ready: false, noMap: false, playing: false,
			}
			: { state: i < 8 ? 'open' : 'locked' }),
	};
};

/** Whose result the match result case shows: before the account resolves the
 *  character is a placeholder (0), which the result screen would ask the server
 *  for - a local id it reads locally. */
const resultPlayer = () => Entities.character.get().id || -1;

/** Each case renders one component in isolation, with the inputs that are
 *  awkward to reach by playing the game. */
export const PLAYGROUND_CASES: PlaygroundCase[] = [
	{
		id: 'xpbar-single',
		label: 'XP bar - one level',
		render: () => <SkillXPBar progress={gain('accuracy', 3, 4, 420)} />,
	},
	{
		id: 'xpbar-many',
		label: 'XP bar - 81 levels',
		render: () => <SkillXPBar progress={gain('accuracy', 0, 81, 298_000)} budgetMs={4000} />,
	},
	{
		id: 'xpbar-past-100',
		label: 'XP bar - 98 to 104, coloured decimals',
		render: () => <SkillXPBar progress={gain('accuracy', 98, 104, 90_000_000, 0.45)} />,
	},
	{
		id: 'progression-one',
		label: 'Progression - 1 skill',
		render: () => <SkillProgression progression={spread(1, 2)} gains={spread(1, 2)} />,
	},
	{
		id: 'progression-full',
		label: 'Progression - 10 skills, deep',
		render: () => <SkillProgression progression={spread(10, 60)} gains={spread(10, 60)} />,
	},
	{
		id: 'upgrade-tier',
		label: 'Upgrade row - Lv101 with overdrive, buying a gear tier',
		render: () => <UpgradeRow skill={tieredSkill()} locked={false} />,
	},
	{
		id: 'confirm-rebirth',
		label: 'Confirm - long rebirth text',
		render: () => <ConfirmMenu
			title="Rebirth as Adri?"
			sub={'Adri becomes Adri_old, stays playable and ranked · '
				+ 'The new character starts from zero and unlocks: DIVINE'}
			confirmLabel="Rebirth"
			color="#ff4089"
			onConfirm={() => {}}
			onClose={() => {}}
		/>,
	},
	{
		id: 'dock-panel',
		label: 'Play dock - open, mid-play with a queue behind it',
		setup: fakeQueue,
		render: () => <DockPanel />,
	},
	{
		id: 'dock-pill',
		label: 'Play dock - collapsed, as it sits over gameplay',
		setup: fakeQueue,
		render: () => <DockPill onExpand={() => {}} />,
	},
	{
		id: 'dock-sparse',
		label: 'Play dock - nothing playing, nothing queued',
		setup: () => {
			PlayQueue.stop();
			void PlayManager.live.set(undefined);
			void SceneManager.current.set(SCENE.SELECT);
			void openPage.set(undefined);
		},
		render: () => <PlayDock />,
	},
	{
		id: 'songselect-queue',
		label: 'Queue carousel - as it sits over a play, with the dock',
		// the real composition: the carousel is a page over the gameplay scene,
		// and the dock fills the column it leaves
		setup: () => {
			fakeQueue();
			void SceneManager.current.set(SCENE.GAME);
			void openPage.set({ page: 'queue' });
		},
		render: () => (<>
			<SongSelect mode="queue" />
			<PlayDock />
		</>),
	},
	{
		id: 'xp-toggle',
		label: 'Debug XP multiplier',
		render: () => <XpMultiplierToggle />,
	},
	{
		id: 'medals-catalogue',
		label: 'Medals - every one',
		render: () => <MedalCatalogue />,
	},
	medalCase('medals-one', 'Medal unlock - one', MEDALS_ONE),
	medalCase('medals-three', 'Medal unlock - three, one secret', MEDALS_THREE),
	medalCase('medals-five', 'Medal unlock - five', MEDALS_FIVE),
	medalCase('medals-backfill', 'Medal unlock - backfill', MEDALS_BACKFILL),
	{
		id: 'mp-lobby',
		label: 'Multiplayer lobby - one open room',
		setup: () => {
			void Multiplayer.matches.set([fakeMatch()]);
		},
		render: () => <Lobby />,
	},
	{
		id: 'mp-result',
		label: 'Multiplayer result - three players, round over',
		setup: () => {
			const me = resultPlayer();
			void Multiplayer.current.set({
				...fakeMatch(),
				lastRound: {
					beatmapId: 1, startedAt: 0, results: [
						{
							characterId: me, score: 912_345, combo: 412, failed: false,
						},
						{
							characterId: -2, score: 640_120, combo: 233, failed: false,
						},
						{
							characterId: -3, score: 210_004, combo: 58, failed: true,
						},
					],
				},
			});
		},
		render: () => <Result
			score={{
				id: 1,
				characterId: resultPlayer(),
				beatmapId: 1,
				score: 912_345,
				accuracy: 0.9734,
				maxCombo: 412,
				judgements: Object.fromEntries(Judgements.map(j => [j, 0])) as JudgementCounts,
				grade: 'A',
				pp: 123,
				ur: 90,
				pfc: false,
				playedAt: Date.now(),
			}}
			progression={spread(4, 12)}
		/>,
	},
	{
		id: 'mp-match',
		label: 'Multiplayer match setup - host alone',
		setup: () => {
			void Multiplayer.current.set(fakeMatch());
		},
		render: () => <MatchSetup />,
	},
];
