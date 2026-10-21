import './UserPage.css';
import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import Link from '../Link';
import UserPageEditor, { type UserPageContent } from './UserPageEditor';

/** osu!web's me! block: the character's own page; its owner writes it while a supporter. */
export default function UserPage({ characterId, page: saved, isSelf, supporter }: {
	characterId: number;
	page: UserPageContent;
	isSelf: boolean;
	supporter: boolean;
}) {
	const [page, setPage] = useState(saved);
	const [editing, setEditing] = useState(false);

	if (!page && !isSelf) return null;

	const body = () => {
		if (editing) {
			return <UserPageEditor
				characterId={characterId}
				raw={page?.raw ?? ''}
				onSaved={p => { setPage(p); setEditing(false); }}
				onCancel={() => setEditing(false)}
			/>;
		}
		if (page) return <div className='bbcode' dangerouslySetInnerHTML={{ __html: page.html }} />;
		return supporter
			? <button type='button' className='user-page__start' onClick={() => setEditing(true)}>
				<Trans>Click here to write your me! page.</Trans>
			</button>
			: <p className='user-page__start'>
				<Trans>Writing a me! page is an <Link to='/store'>osu!supporter</Link> perk.</Trans>
			</p>;
	};

	return <div className='character__block user-page'>
		<div className='character__block-title'><Trans>me!</Trans></div>
		{isSelf && supporter && page && !editing && <button
			type='button'
			className='user-page__edit'
			onClick={() => setEditing(true)}
		>
			<FontAwesomeIcon icon={faPen} /> <Trans>Edit</Trans>
		</button>}
		{body()}
	</div>;
}
