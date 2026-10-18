import { Trans } from '@lingui/react/macro';

/** A page that doesn't exist, or that failed to load (the server says why). */
export default function PageError({ error }: { error?: Error }) {
	return <div className='page-contents'>
		{error ? error.message : <Trans>This page doesn't exist.</Trans>}
	</div>;
}
