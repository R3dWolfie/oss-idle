import { MAX_CHAT_LENGTH } from '@oss-idle/shared/community/wire';

/** The line being answered, as the log holds it. */
export type ReplyTarget = { id: string, name: string, color?: string, text: string };

/** What answering sends: @Name in front (once) so they're pinged, unless it would go past the limit. */
export const replyBody = (name: string, text: string): string => {
	const at = `@${name}`;
	if (text.toLowerCase().startsWith(at.toLowerCase())) return text;
	const body = `${at} ${text}`;
	return body.length <= MAX_CHAT_LENGTH ? body : text;
};
