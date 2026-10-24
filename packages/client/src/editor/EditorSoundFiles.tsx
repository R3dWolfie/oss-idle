import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	ph,
	plural,
} from '@lingui/core/macro';
import { fileUses } from '@oss-idle/shared/editor/hitsounds';
import { desktop } from '@oss-idle/shared/desktop';
import ConfirmMenu from '../components/ConfirmMenu';
import {
	pickFile,
	pickFiles,
} from '../pickFile';
import type EditorSession from './session';

const AUDIO = 'audio/wav,audio/ogg,audio/mpeg,.wav,.ogg,.mp3';

/**
 * The map's sound files: what each is (a sample set's hitsound at a custom index, or a
 * note's own sample), how many notes of this difficulty play it, and a way to hear,
 * replace or delete it; new ones added.
 */
export default function EditorSoundFiles({ session, files }: {
	session: EditorSession,
	files: string[],
}) {
	const { t } = useLingui();
	const [deleting, setDeleting] = useState<{ name: string, uses: number }>();
	const uses = fileUses(session.snapshot, files);
	const sets: Record<string, string> = {
		normal: t`Normal`, soft: t`Soft`, drum: t`Drum`, 
	};
	const sounds: Record<string, string> = {
		normal: t`hit`, whistle: t`whistle`, finish: t`finish`, clap: t`clap`,
	};
	const kind = (name: string) => {
		const named = /^(normal|soft|drum)-hit(normal|whistle|finish|clap)(\d*)\.\w+$/i.exec(name);
		if (!named) return t`Keysound`;
		const index = named[3] || '1';
		return `${sets[named[1].toLowerCase()]} ${sounds[named[2].toLowerCase()]} · ${index}`;
	};
	const replace = async (name: string) => {
		const picked = await pickFile(AUDIO);
		if (picked) await session.replaceSample(name, picked);
	};
	const add = async () => {
		const picked = await pickFiles(AUDIO);
		if (picked.length) await session.addSamples(picked);
	};
	const remove = (name: string) => {
		const used = uses.get(name) ?? 0;
		if (used) setDeleting({
			name, uses: used, 
		});
		else void session.removeSample(name);
	};

	return (
		<>
			<div className='editor__commands-group'><Trans>The map's sound files</Trans></div>
			<div className='editor__stat editor__sound-files'>
				{files.length === 0 && (
					<span className='editor__hint'><Trans>No sound files yet</Trans></span>
				)}
				{files.map(name => (
					<div key={name} className='editor__sound-file'>
						<button
							className='editor__seek-to'
							aria-label={t`Play ${ph({ file: name })}`}
							onClick={() => void session.playSample(name)}
						>
							▸
						</button>
						<span className='editor__sound-file-name'>{name}</span>
						<span className='editor__sound-file-kind'>{kind(name)}</span>
						<span className='editor__sound-file-uses'>
							{plural(ph({ count: uses.get(name) ?? 0 }), {
								one: '# note', other: '# notes', 
							})}
						</span>
						<button className='editor__small' onClick={() => void replace(name)}>
							<Trans>Replace</Trans>
						</button>
						<button
							className='editor__remove'
							aria-label={t`Delete ${ph({ file: name })}`}
							onClick={() => remove(name)}
						>
							×
						</button>
					</div>
				))}
				<span className='editor__row'>
					<button className='editor__small' onClick={() => void add()}>
						<Trans>Add sound files...</Trans>
					</button>
					{desktop()?.mapFolder && (
						<button className='editor__small' onClick={() => void session.openFolder()}>
							<Trans>Open the map's folder</Trans>
						</button>
					)}
				</span>
			</div>
			{deleting && (
				<ConfirmMenu
					title={t`Delete ${ph({ file: deleting.name })}?`}
					sub={plural(ph({ count: deleting.uses }), {
						one: '# note uses this file. It will play the default sound instead.',
						other: '# notes use this file. They will play the default sounds instead.',
					})}
					confirmLabel={t`Delete`}
					onConfirm={() => void session.removeSample(deleting.name)}
					onClose={() => setDeleting(undefined)}
				/>
			)}
		</>
	);
}
