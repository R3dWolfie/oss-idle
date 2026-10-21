import { inArray } from 'drizzle-orm';
import { __ } from '@oss-idle/shared/i18n/translate';
import { db } from './db/client';
import { characters } from './db/schema/character';
import {
	profileNames,
	renderBBCode,
} from './bbcode';
import { proxiedUrl } from './mediaProxy';

/** A me! page as HTML, its `[profile]` names linked to their characters. */
export const renderUserPage = async (raw: string) => {
	const names = [...new Set(profileNames(raw))].slice(0, 100);
	const found = names.length
		? await db.select({
			id: characters.id, name: characters.name,
		}).from(characters).where(inArray(characters.name, names))
		: [];
	return renderBBCode(raw, {
		proxy: proxiedUrl,
		profiles: new Map(found.map(c => [c.name.toLowerCase(), c.id])),
		wrote: name => __('{name} wrote:', undefined, { name }),
		spoiler: __('SPOILER'),
	});
};

/** What a profile carries of its me! page: absent when blank. */
export const userPageOf = async (raw: string | null) => raw?.trim()
	? {
		raw, html: await renderUserPage(raw),
	}
	: undefined;
