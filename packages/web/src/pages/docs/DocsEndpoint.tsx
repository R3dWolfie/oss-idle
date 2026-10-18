import type { Endpoint } from './content';
import type { Language } from './samples';
import DocsSample from './DocsSample';
import DocsParams from './DocsParams';
import DocsScope from './DocsScope';

/** One endpoint, laid out like a Scribe page: badges, examples on the right, parameters, response. */
export default function DocsEndpoint({ endpoint: e, api, language }: {
	endpoint: Endpoint;
	api: string;
	language: Language;
}) {
	return <>
		<h2 id={e.id}>{e.title}</h2>
		<p>
			{e.user && <>
				<a className='docs__badge docs__badge--user' href='#resource-owner'>requires user</a>{' '}
			</>}
			<a className='docs__badge docs__badge--oauth' href='#authentication'>OAuth</a>{' '}
			<DocsScope scope={e.scope} />
		</p>
		<p>{e.about}</p>
		<DocsSample
			request={{
				method: 'GET', url: `${api}/api/v2${e.example.path}`, query: e.example.query,
			}}
			response={e.response}
			language={language}
		/>
		<h3>Request</h3>
		<p>
			<small className='docs__badge docs__badge--get'>GET</small> <b><code>{e.path}</code></b>
		</p>
		{e.url && <DocsParams title='URL Parameters' params={e.url} />}
		{e.query && <DocsParams title='Query Parameters' params={e.query} />}
		<h3>Response format</h3>
		<p>{e.format}</p>
	</>;
}
