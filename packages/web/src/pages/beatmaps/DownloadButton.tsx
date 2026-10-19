import type { MouseEvent } from 'react';
import { Trans } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import {
	MAP_LINK_CHANNEL,
	mapDownloadLink,
} from '@oss-idle/shared/beatmap';

/** How long an open game has to answer before the desktop app is asked instead. */
const ANSWER_WAIT = 300;

/** Downloads the set into the game: an open game tab or the in-game browser's
 *  game takes it, otherwise the link opens the desktop app. */
export default function DownloadButton({ setId }: { setId: number }) {
	const link = mapDownloadLink(setId);
	const send = (e: MouseEvent) => {
		e.preventDefault();
		const channel = new BroadcastChannel(MAP_LINK_CHANNEL);
		const fallback = setTimeout(() => {
			channel.close();
			location.href = link;
		}, ANSWER_WAIT);
		channel.onmessage = () => {
			clearTimeout(fallback);
			channel.close();
		};
		channel.postMessage(link);
	};
	return <a href={link} onClick={send} className='mapset__button'>
		<FontAwesomeIcon icon={faDownload} /> <Trans>Download</Trans>
	</a>;
}
