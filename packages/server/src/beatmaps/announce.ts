import {
	apiBaseUrl,
	env,
	isProd,
} from '../env';
import { publish } from '../discord/publish';
import {
	mapCoverUrl,
	type MapCover,
} from '@osu-idle/shared/beatmap';

export type AnnounceSet = MapCover & {
	artist: string;
	title: string;
	creator: string;
	difficulties: { version: string; sr: number }[];
};

/** Post the "now ranked" embed to the map feed. Fires from the rank sweep when a
 *  scheduled map's date passes (not at upload), so each map announces once it's
 *  actually live. No-op outside prod or without a configured webhook. */
export const announceRanked = async (set: AnnounceSet): Promise<void> => {
	if (!isProd || !env.MAP_FEED_WEBHOOK) return;

	const cover = mapCoverUrl(set, 'cover', apiBaseUrl);
	const asc = [...set.difficulties].sort((a, b) => a.sr - b.sr);

	await publish(env.MAP_FEED_WEBHOOK, {
		embeds: [
			{
				title: `${set.artist} - ${set.title}`,
				description: asc.map(d => `\`${d.sr.toFixed(2)}☆\` \`${d.version}\``).join('\n'),
				color: 5814783,
				author: { name: `New ranked map by ${set.creator}` },
				fields: [{
					name: 'Ranked', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, 
				}],
				...cover && { image: { url: cover } },
			},
		],
		attachments: [],
	});
};
