import type { Scope } from '@osu-idle/shared/oauth';

/** A scope's badge, linking to its row in the Scopes table. */
export default function DocsScope({ scope }: { scope: Scope }) {
	return <a className='docs__badge docs__badge--scope' href={`#scope-${scope}`}>{scope}</a>;
}
