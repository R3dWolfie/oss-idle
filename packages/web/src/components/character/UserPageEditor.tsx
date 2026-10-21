import {
	useRef,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { USER_PAGE_MAX } from '@oss-idle/shared/profile';
import {
	previewUserPage,
	saveUserPage,
} from '../../api/characters';
import BBCodeToolbar from './BBCodeToolbar';

export type UserPageContent = Awaited<ReturnType<typeof saveUserPage>>['userPage'];

/** Write the me! page in osu! BBCode, with a preview before saving. */
export default function UserPageEditor({ characterId, raw, onSaved, onCancel }: {
	characterId: number;
	raw: string;
	onSaved: (page: UserPageContent) => void;
	onCancel: () => void;
}) {
	const { t } = useLingui();
	const textarea = useRef<HTMLTextAreaElement>(null);
	const [text, setText] = useState(raw);
	const [preview, setPreview] = useState<string>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	const run = async (fn: () => Promise<void>) => {
		setBusy(true);
		setError(undefined);
		try {
			await fn();
		} catch (e) {
			setError(String((e as Error).message ?? e));
		} finally {
			setBusy(false);
		}
	};

	const save = () => run(async () => onSaved((await saveUserPage(characterId, text)).userPage));
	const showPreview = () => run(async () => setPreview((await previewUserPage(text)).html));

	return <div className='user-page-editor'>
		{preview === undefined
			? <>
				<BBCodeToolbar textarea={textarea} onChange={setText} />
				<textarea
					ref={textarea}
					className='user-page-editor__text'
					value={text}
					maxLength={USER_PAGE_MAX}
					placeholder={t`Write something about yourself, in BBCode.`}
					onChange={e => setText(e.target.value)}
				/>
			</>
			: <div
				className='bbcode user-page-editor__preview'
				dangerouslySetInnerHTML={{ __html: preview }}
			/>}
		{error && <div className='user-page-editor__error'>{error}</div>}
		<div className='user-page-editor__actions'>
			<button type='button' className='user-page-editor__button' disabled={busy} onClick={onCancel}>
				<Trans>Cancel</Trans>
			</button>
			{preview === undefined
				? <button
					type='button'
					className='user-page-editor__button'
					disabled={busy}
					onClick={() => void showPreview()}
				>
					<Trans>Preview</Trans>
				</button>
				: <button
					type='button'
					className='user-page-editor__button'
					onClick={() => setPreview(undefined)}
				>
					<Trans>Edit</Trans>
				</button>}
			<button
				type='button'
				className='user-page-editor__button user-page-editor__button--save'
				disabled={busy}
				onClick={() => void save()}
			>
				<Trans>Save</Trans>
			</button>
		</div>
	</div>;
}
