import { ph } from '@lingui/core/macro';
import {
	Plural,
	Trans,
} from '@lingui/react/macro';

/** A silence's length in its largest whole unit; 0 lasts until lifted. */
export default function SanctionLength({ seconds }: { seconds: number }) {
	if (!seconds) return <Trans>Permanent</Trans>;
	const days = Math.floor(seconds / 86400);
	if (days) return <Plural value={ph({ days })} one='# day' other='# days' />;
	const hours = Math.floor(seconds / 3600);
	if (hours) return <Plural value={ph({ hours })} one='# hour' other='# hours' />;
	const minutes = Math.max(1, Math.ceil(seconds / 60));
	return <Plural value={ph({ minutes })} one='# minute' other='# minutes' />;
}
