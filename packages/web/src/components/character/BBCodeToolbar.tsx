import type { RefObject } from 'react';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faBold,
	faHeading,
	faImage,
	faItalic,
	faLink,
	faList,
	faListOl,
	faSquareCaretDown,
	faStrikethrough,
	type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

/** osu!web's BBCode editor buttons: each wraps the selection in its tags. */
export default function BBCodeToolbar({ textarea, onChange }: {
	textarea: RefObject<HTMLTextAreaElement>;
	onChange: (value: string) => void;
}) {
	const { t } = useLingui();

	const wrap = (open: string, close: string) => {
		const el = textarea.current;
		if (!el) return;
		const { selectionStart: start, selectionEnd: end, value } = el;
		onChange(value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end));
		requestAnimationFrame(() => {
			el.focus();
			el.setSelectionRange(start + open.length, end + open.length);
		});
	};

	const buttons: [IconDefinition, string, string, string][] = [
		[faBold, t`Bold`, '[b]', '[/b]'],
		[faItalic, t`Italic`, '[i]', '[/i]'],
		[faStrikethrough, t`Strikethrough`, '[s]', '[/s]'],
		[faHeading, t`Heading`, '[heading]', '[/heading]'],
		[faLink, t`Link`, '[url]', '[/url]'],
		[faSquareCaretDown, t`Spoiler Box`, '[box=]', '[/box]'],
		[faListOl, t`Numbered List`, '[list=1]\n[*]', '\n[/list]'],
		[faList, t`List`, '[list]\n[*]', '\n[/list]'],
		[faImage, t`Image`, '[img]', '[/img]'],
	];

	return <div className='bbcode-toolbar'>
		{buttons.map(([icon, title, open, close]) => <button
			key={open}
			type='button'
			className='bbcode-toolbar__button'
			title={title}
			onClick={() => wrap(open, close)}
		>
			<FontAwesomeIcon icon={icon} fixedWidth />
		</button>)}
		<select
			className='bbcode-toolbar__size'
			value=''
			onChange={e => wrap(`[size=${e.target.value}]`, '[/size]')}
		>
			<option value='' disabled>{t`Font Size`}</option>
			<option value='50'>{t`Tiny`}</option>
			<option value='85'>{t`Small`}</option>
			<option value='100'>{t`Normal`}</option>
			<option value='150'>{t`Large`}</option>
		</select>
	</div>;
}
