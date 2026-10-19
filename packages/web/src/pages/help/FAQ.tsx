import './FAQ.css';
import { Trans } from '@lingui/react/macro';
import {
	MEDAL_XP_BONUS,
	PRESTIGE_MIN_LEVEL,
	PRESTIGE_XP_BONUS,
	REBIRTH_MIN_OVERALL_LEVEL,
	UPGRADE_LEVELS,
	UPGRADE_XP_BONUS,
	BASE_MAX_UPGRADES,
} from '@oss-idle/shared/upgrades';
import Link from '../../components/Link';

const upgradeBonus = UPGRADE_XP_BONUS * 100;
const prestigeBonus = PRESTIGE_XP_BONUS * 100;
const bronzeBonus = MEDAL_XP_BONUS.bronze * 100;
const divineBonus = MEDAL_XP_BONUS.divine * 100;

export default function FAQ() {
	return (<main className='page-contents faq'>
		<h2><Trans>The game</Trans></h2>
		<details>
			<summary><Trans>What is oss!idle?</Trans></summary>
			<p><Trans>
				An idle game built on osu!mania 4K. You don't press the keys: your character plays the maps
				for you. Every play earns experience in its skills, better skills mean better plays, and
				better plays climb the rankings.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>Do I need an osu! account?</Trans></summary>
			<p><Trans>
				No. Without signing in you play as a guest: everything is saved in your browser only and
				nothing is ranked. Sign in with osu! to get a character on the server, ranked scores, pp and
				a public profile.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>What are skills?</Trans></summary>
			<p><Trans>
				Your character has eleven skills: accuracy, speed, stamina, jack speed, coordination,
				release, reading, consistency, concentration, speed jam and memory. Each one levels up on
				its own, from the parts of a map that test it. A jack-heavy map trains jack speed, a long
				map trains stamina, and so on. Your overall level grows with all of them.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>How do I earn experience?</Trans></summary>
			<p><Trans>
				By playing. Ranked and guest plays give experience; unranked plays don't. Pick maps that
				push the skills you want to train: the song select shows what each map gave you last time.
			</Trans></p>
		</details>

		<h2><Trans>Progression</Trans></h2>
		<details>
			<summary><Trans>What are upgrades?</Trans></summary>
			<p><Trans>
				Each skill has a gear ladder of {BASE_MAX_UPGRADES} upgrades.
				Each one costs {UPGRADE_LEVELS} levels of that skill and permanently adds {upgradeBonus}%
				experience gain to it. The more levels you have above the price, the more overdrive the purchase
				builds, which multiplies that bonus.
			</Trans></p>
			<p><Trans>
				Spending levels lowers your skill and overall levels, so it can drop you in the rankings.
				That is the trade: a lower level now for faster progress later.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>What is prestige?</Trans></summary>
			<p><Trans>
				Once a skill reaches level {PRESTIGE_MIN_LEVEL}, you can prestige it. Its level, experience,
				upgrades and overdrive reset to zero. In exchange it keeps a bonus level, one more upgrade
				slot and a permanent {prestigeBonus}% experience multiplier that stacks with each prestige.
				Each prestige needs one more level than the last.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>What is rebirth?</Trans></summary>
			<p><Trans>
				At overall level {REBIRTH_MIN_OVERALL_LEVEL}, you can start a brand new character one
				generation up. Each generation unlocks something new; the first is the Divine judgement. Your
				old character is not deleted: it stays playable, ranked and keeps all its progress. If the
				new one takes its name, the old one is renamed with _old, like on osu!.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>Can I buy upgrades during a play?</Trans></summary>
			<p><Trans>
				Yes. A play's result and experience are decided when it starts, so anything you buy while it
				runs is applied as soon as it ends, in the order you bought it.
			</Trans></p>
		</details>

		<h2><Trans>Playing</Trans></h2>
		<details>
			<summary><Trans>What is the difference between ranked, unranked and guest plays?</Trans></summary>
			<ul>
				<li><Trans>
					<b>Ranked:</b> signed in, on a ranked difficulty. The server decides the score, which
					counts for pp, rankings, medals and experience.
				</Trans></li>
				<li><Trans>
					<b>Unranked:</b> signed in, on a map or difficulty that isn't ranked. Saved in your
					browser only, with no experience.
				</Trans></li>
				<li><Trans>
					<b>Guest:</b> signed out. Saved in your browser only, with local experience.
				</Trans></li>
			</ul>
		</details>
		<details>
			<summary><Trans>Do I have to watch my plays?</Trans></summary>
			<p><Trans>
				No. A play keeps running when you leave the gameplay screen, and a ranked one even when you
				close the game. You can come back to it from any device and watch the rest.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>What are the queue and autopilot?</Trans></summary>
			<p><Trans>
				The queue is the list of maps your character plays one after the other. Autopilot fills it
				from the song select: a playlist, the next songs, shuffle, or the same map on loop. You can
				reorder it, skip ahead or stop after the current map. The queue is not saved when you close
				the game; save it as a playlist to keep it.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>Why does my game stop in the background?</Trans></summary>
			<p><Trans>
				Browsers slow down tabs you aren't looking at, which can stall autopilot.
				The <Link to='/download'>desktop app</Link> doesn't have this problem:
				it keeps playing while minimised and updates itself.
			</Trans></p>
		</details>

		<h2><Trans>Maps and rankings</Trans></h2>
		<details>
			<summary><Trans>Which maps can be ranked?</Trans></summary>
			<p><Trans>
				osu!mania 4K difficulties only. Ranking is decided per difficulty, so a set can have some of
				its difficulties ranked and others not.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>How do I get a map ranked?</Trans></summary>
			<p><Trans>
				Propose it on the <Link to='/maps/requests'>map requests</Link> page. Any 4K map from osu! can
				be proposed, even a graveyarded one. Other players can back your request, and the team
				reviews the queue: an accepted map goes through nomination before it is ranked.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>What happens to my scores if a map is unranked?</Trans></summary>
			<p><Trans>
				Its scores, pp and ranking progress are removed. The experience your skills earned on it stays.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>How is pp calculated?</Trans></summary>
			<p><Trans>
				Each ranked score is worth some pp. Your total adds up your best score on every map, sorted
				from best to worst, each one counting 5% less than the one before it, like on osu!.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>What are medals?</Trans></summary>
			<p><Trans>
				Achievements for skill levels, dedication, mastery and ranked play, plus a few secret ones.
				They are awarded on the result screen of a ranked play. Each medal permanently raises
				your experience gain, from {bronzeBonus}% for a bronze one to {divineBonus}% for a divine
				one, and the bonuses stack.
			</Trans></p>
		</details>

		<h2><Trans>Customisation</Trans></h2>
		<details>
			<summary><Trans>Can I change how the game looks?</Trans></summary>
			<p><Trans>
				Yes. Skins change the playfield, notes and gameplay interface, and you can make your own in
				the skin editor with a live preview. Players can share their skins with everyone.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>What are add-ons?</Trans></summary>
			<p><Trans>
				Small scripts made by players that add features to the game. Shared add-ons are reviewed by
				the team before they are published, but they run inside your game: only install the ones you
				trust.
			</Trans></p>
		</details>
		<details>
			<summary><Trans>Can I talk to other players?</Trans></summary>
			<p><Trans>
				Press F9 in the game to open the community overlay: who is online, where they are on the
				world map, and a chat everyone shares.
			</Trans></p>
		</details>
	</main>);
}
