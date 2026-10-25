// Replies travel as text, so every client shows them, and one without this reads them fine as they are:
//   [↩ NeomiCryo: i got like 30 in the first… #1a2b3c4d] @NeomiCryo same lol
// The #code is the start of the answered line's id (the server's, the same for everyone, history included),
// so the reply finds its line exactly; the name and the taste are for whoever reads it raw.

export type ReplyTarget = { name: string, id: string, snippet: string };
export type Reply = ReplyTarget & { body: string };

const ID_LENGTH = 8;
const SNIPPET_LENGTH = 40;
const REPLY_RE = /^\[↩ (.{1,40}?): (.{0,60}?) #([0-9a-f]{8})\] ([\s\S]*)$/u;
// a bracket or a # in the taste would end the quote early
const quotable = (s: string) => s.replace(/[[\]#]/g, '');

/** The reply a line carries, if it's one. */
export const parseReply = (text: string): Reply | undefined => {
	const m = REPLY_RE.exec(text);
	return m ? {
		name: m[1]!, snippet: m[2]!, id: m[3]!, body: m[4]!,
	} : undefined;
};

/** A short taste of a line to quote: what it says (its own quote dropped), a link as "link". */
export const snippetOf = (text: string): string => {
	const said = (parseReply(text)?.body ?? text)
		.replace(/https?:\/\/\S+/g, 'link').replace(/\s+/g, ' ').trim();
	const t = quotable(said);
	return t.length > SNIPPET_LENGTH ? `${t.slice(0, SNIPPET_LENGTH - 1)}…` : t;
};

/** The target for answering a line. */
export const replyTo = (line: { id: string, name: string, text: string }): ReplyTarget => ({
	name: line.name, id: line.id.replace(/-/g, '').slice(0, ID_LENGTH), snippet: snippetOf(line.text),
});

/** What answering sends: the quote, then the message with @Name in front (once) so they're pinged. */
export const replyLine = (to: ReplyTarget, text: string): string => {
	const at = `@${to.name}`;
	const body = text.toLowerCase().startsWith(at.toLowerCase()) ? text : `${at} ${text}`;
	return `[↩ ${quotable(to.name)}: ${to.snippet} #${to.id}] ${body}`;
};

/** The line a reply answers, among `lines`. */
export const findQuoted = <L extends { id: string }>(
	lines: readonly L[], reply: ReplyTarget,
): L | undefined => lines.find(l => l.id.replace(/-/g, '').startsWith(reply.id));
