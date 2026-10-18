import type { Sample } from './content';
import {
	jsonHtml,
	requestHtml,
	type Language,
} from './samples';

/** The dark column's example request and response, as osu!'s docs show them. */
export default function DocsSample({ request, response, language }: {
	request?: Sample;
	response?: unknown;
	language: Language;
}) {
	return <>
		{request && <>
			<blockquote>Example request:</blockquote>
			<pre><code dangerouslySetInnerHTML={{ __html: requestHtml(request, language) }} /></pre>
		</>}
		{response !== undefined && <>
			<blockquote><p>Example response (200):</p></blockquote>
			<pre className='docs__response'>
				<code dangerouslySetInnerHTML={{ __html: jsonHtml(response) }} />
			</pre>
		</>}
	</>;
}
