import { repoCommitUrl } from '@oss-idle/shared/addon';
import type { AdminAddon } from '../../api/addons';

/** Where a repo add-on's build comes from. */
export default function AddonRepoLine({ row }: { row: AdminAddon }) {
	const built = row.commit && row.tag && `${row.tag} (${row.commit.slice(0, 7)})`;

	return (
		<span className='admin-list__creator'>
			<a href={row.repoUrl} target='_blank' rel='noreferrer'>{row.repoUrl}</a>
			{row.commit && built && <> · built {row.repoUrl
				? <a href={repoCommitUrl(row.repoUrl, row.commit)} target='_blank' rel='noreferrer'>{built}</a>
				: built}</>}
			{' · '}bundle {Math.round(row.source.length / 1024)} KB
			{' · '}build {row.buildStatus}
		</span>
	);
}
