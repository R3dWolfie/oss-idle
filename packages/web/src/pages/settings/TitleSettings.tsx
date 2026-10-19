import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import {
	MEDALS,
	medalLook,
	type MedalDef,
} from '@oss-idle/shared/achievements/catalogue';
import { medalName } from '@oss-idle/shared/display/medals';
import {
	getCharacter,
	getCharacterMedals,
} from '../../api/characters';
import { setTitle } from '../../api/users';
import MedalIcon from '../../components/character/MedalIcon';

/** Pick which held medal's name shows under the character's name. */
export default function TitleSettings({ id }: { id: string }) {
	const { t } = useLingui();
	const loaded = useAsync(() => Promise.all([getCharacter(id), getCharacterMedals(id)]), [id]);
	const [chosen, setChosen] = useState<string>();
	if (!loaded) return <Trans>Loading…</Trans>;

	const [character, medals] = loaded;
	const held = new Set(medals.held.map(m => m.id));
	const current = chosen ?? character.title ?? '';
	const choose = (next: string) => {
		setChosen(next);
		setTitle(next || undefined).catch(() => setChosen(current));
	};
	const options: { value: string; label: string; medal?: MedalDef }[] = [
		{
			value: '', label: t`no title`,
		},
		...MEDALS.filter(m => held.has(m.id)).map(m => ({
			value: m.id, label: medalName(m.id), medal: m,
		})),
	];

	return <>
		<div className='settings__hint'>
			<Trans>Wear the name of a medal you hold under your name on your profile.</Trans>
		</div>
		<div className='settings__radios'>
			{options.map(o => <label key={o.value} className='settings__radio'>
				<input
					type='radio'
					name='title'
					checked={current === o.value}
					onChange={() => choose(o.value)}
				/>
				{o.medal && <span className='settings__medal'><MedalIcon look={medalLook(o.medal)} /></span>}
				{o.label}
			</label>)}
		</div>
	</>;
}
