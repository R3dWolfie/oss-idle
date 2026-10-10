import {
	MedalCategories,
	MEDALS,
} from '@osu-idle/shared/achievements/catalogue';
import { MEDAL_XP_BONUS } from '@osu-idle/shared/upgrades';
import { medalTierName } from '@osu-idle/shared/display/medals';
import MedalBadge from '../components/medals/MedalBadge';
import { medalSamples } from './medalSamples';
import '../components/medals/medals.css';

/** Playground-only sheet of every medal, for reviewing the list. */
export default function MedalCatalogue() {
	const samples = medalSamples();
	return <div className="medal-catalogue">
		{MedalCategories.map(category => <section key={category}>
			<h2>{category} ({MEDALS.filter(m => m.category === category).length})</h2>
			<div className="medal-catalogue__grid">
				{samples
					.filter((_, i) => MEDALS[i].category === category)
					.map(medal => <div key={medal.id} className={`medal-catalogue__item tier-${medal.look.tier}`}>
						<MedalBadge look={medal.look} />
						<div>
							<div className="medal-catalogue__name">{medal.name}</div>
							<div className="medal-catalogue__tier">
								{medalTierName(medal.look.tier)} · +{MEDAL_XP_BONUS[medal.look.tier] * 100}% XP
							</div>
							<div className="medal-catalogue__description">{medal.description}</div>
						</div>
					</div>)}
			</div>
		</section>)}
	</div>;
}
