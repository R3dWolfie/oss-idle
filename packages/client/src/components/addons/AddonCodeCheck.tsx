import {
	useEffect,
	useState,
} from 'react';
import { Trans } from '@lingui/react/macro';
import type { AddonViolation } from '@oss-idle/shared/addonRules';

const DEBOUNCE_MS = 400;

/** The server's rules on code an add-on may ship, run as the author types. */
export default function AddonCodeCheck({ source }: { source: string }) {
	const [found, setFound] = useState<AddonViolation[]>([]);

	useEffect(() => {
		let live = true;
		const timer = setTimeout(() => {
			// the parser loads with the editor, not with the game
			void import('@oss-idle/shared/addonRules')
				.then(({ addonViolations }) => live && setFound(addonViolations(source)));
		}, DEBOUNCE_MS);
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [source]);

	if (!found.length) return null;
	return (
		<div className='addon-check'>
			<span className='addon-check__title'>
				<Trans>Not allowed: add-ons may not run code players cannot read in them</Trans>
			</span>
			{found.slice(0, 10).map(v => (
				<span key={`${v.line}:${v.column}:${v.rule}`}>{v.line}:{v.column + 1} {v.rule}</span>
			))}
		</div>
	);
}
