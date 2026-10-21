import { readFileSync } from 'node:fs';

/** The thank-you a buyer gets once their supporter tag lands, sent from oss.idle@boitech.dev
 *  as text and as HTML with the signature in supporterSignature.html; replies come back there.
 *  Stripe sends the receipt. */

export type Thanks = {
	buyerName: string | undefined;
	/** Set when the tag went to someone else. */
	giftTo: string | undefined;
	months: number;
	/** How long the donation keeps the server running. */
	serverSeconds: number | undefined;
	recurring: boolean;
	tagEndsAt: Date | undefined;
	storeUrl: string;
	/** The buyer's first order, gifts included. */
	firstPurchase: boolean;
	/** The first tag the recipient ever got. */
	firstTag: boolean;
	/** The recipient's profile hearts, 0 to 3. */
	heartsBefore: number;
	heartsAfter: number;
};

const day = new Intl.DateTimeFormat('en-GB', {
	dateStyle: 'long', timeZone: 'UTC',
});
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
const UNITS: [string, number][] = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];

/** 93784 → "1 day, 2 hours, 3 minutes and 4 seconds" */
const duration = (seconds: number) => {
	const parts = UNITS.flatMap(([unit, size]) => {
		const n = Math.floor(seconds / size);
		seconds %= size;
		return n ? [plural(n, unit)] : [];
	});
	return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
};

// the text part's copy of supporterSignature.html; "-- " sets it apart in mail clients
const SIGNATURE = [
	'-- ',
	'Adrien Boitelle',
	'Developer · oss!idle',
	'The ultimate VSRG idle game',
	'Play now: https://oss.idle.rhythmgamers.net | oss.idle@boitech.dev',
	'by BoiTech',
].join('\n');
const BODY_STYLE = 'font-family:Torus,\'Segoe UI\',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;';
const SIGNATURE_HTML = readFileSync(new URL('supporterSignature.html', import.meta.url), 'utf8');

const escape = (text: string) => text
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');

/** The text body as HTML: same lines, links clickable. */
const asHtml = (text: string) => escape(text)
	.replace(/https?:\/\/\S+/g, url => `<a href="${url}" style="color:#ff66aa;">${url}</a>`)
	.replace(/\n/g, '<br>\n');

export const supporterThanks = (r: Thanks): { subject: string; text: string; html: string } => {
	const tag = plural(r.months, 'month');
	const subject = 'Thank you for supporting oss!idle !';

	const until = r.tagEndsAt ?
		` Your supporter tag will now last until ${day.format(r.tagEndsAt)}.`
		: '';

	const what = r.giftTo
		? `${r.giftTo} has received ${tag} of supporter thanks to you.${r.firstTag ? ' It\'s their first ever !' : ''}`
		: `We added ${tag} of supporter tag to your account.${until}`;

	const running = r.serverSeconds
		? `
Your support keeps the server running for ${duration(r.serverSeconds)} !
`
		: '';

	const hearts = (r.heartsBefore !== r.heartsAfter) ?
		`Your profile now has ${plural(r.heartsAfter, 'heart')} !`
		: '';

	const renews = r.recurring
		? `\nYou\'ve asked for the tag to renew every ${tag}. You can manage this from the store:\n${r.storeUrl}\n`
		: '';

	const body = `Hi${r.buyerName ? ` ${r.buyerName}` : ''},

Thank you so much for supporting oss!idle!

${what}
${running}
${hearts}

${renews}

Any question? Just reply to this email and I'll get back to you
`;
	return {
		subject,
		text: `${body}\n${SIGNATURE}\n`,
		html: `<div style="${BODY_STYLE}">\n${asHtml(body)}<br>\n${SIGNATURE_HTML}</div>\n`,
	};
};
