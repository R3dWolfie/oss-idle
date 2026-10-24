import { useState } from 'react';
import Prism from 'prismjs';
import 'prism-themes/themes/prism-vsc-dark-plus.css';

/** The "View code" toggle and panel for one add-on. */
export default function AddonRowCode({ source }: { source: string }) {
	const [open, setOpen] = useState(false);
	const html = () => Prism.highlight(source, Prism.languages.javascript, 'javascript');

	return (
		<>
			<div className='addons-admin__codebar'>
				<button
					className={`admin-list__btn ${open ? 'current' : ''}`}
					onClick={() => setOpen(o => !o)}
				>
					{open ? 'Hide code' : 'View code'}
				</button>
			</div>
			{open && (
				<pre className='language-javascript addons-admin__code'>
					<code className='language-javascript'
						dangerouslySetInnerHTML={{ __html: html() }} />
				</pre>
			)}
		</>
	);
}
