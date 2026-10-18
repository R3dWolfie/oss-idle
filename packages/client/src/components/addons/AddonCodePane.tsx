import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import AddonCodeEditor from './AddonCodeEditor';
import AddonCodeView from './AddonCodeView';
import CodeDiff from './CodeDiff';

type Props = {
	editing: boolean,
	source: string,
	onChange: (source: string) => void,
	/** View mode: an older source to diff against, enabling "View changes". */
	diffAgainst?: string,
};

type Shown = 'none' | 'code' | 'diff';

/**
 * The right column shared by every add-on view: an editable editor, or in view
 * mode the code / its diff, hidden until asked for since a big add-on is slow
 * to highlight.
 */
export default function AddonCodePane({
	editing,
	source,
	onChange,
	diffAgainst,
}: Props) {
	const [shown, setShown] = useState<Shown>('none');
	const toggle = (s: Shown) => setShown(cur => (cur === s ? 'none' : s));

	if (editing) {
		return (
			<>
				<div className='addon-view__codehead'>
					<span className='addon-view__codelabel'><Trans>Code</Trans></span>
				</div>
				<AddonCodeEditor value={source} onChange={onChange} />
			</>
		);
	}

	return (
		<>
			<div className='addon-view__codehead'>
				<button
					className={`addons__sort-btn ${shown === 'code' ? 'is-active' : ''}`}
					onClick={() => toggle('code')}
				>
					{shown === 'code' ? <Trans>Hide code</Trans> : <Trans>View code</Trans>}
				</button>
				{diffAgainst !== undefined && (
					<button
						className={`addons__sort-btn ${shown === 'diff' ? 'is-active' : ''}`}
						onClick={() => toggle('diff')}
					>
						{shown === 'diff' ? <Trans>Hide changes</Trans> : <Trans>View changes</Trans>}
					</button>
				)}
			</div>
			{shown === 'code' && <AddonCodeView source={source} />}
			{shown === 'diff' && diffAgainst !== undefined && <CodeDiff before={diffAgainst} after={source} />}
		</>
	);
}
