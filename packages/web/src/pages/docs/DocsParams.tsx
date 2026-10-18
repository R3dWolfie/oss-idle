import type { Param } from './content';

/** A panel of parameters: name, type, whether it may be left out, and what it is. */
export default function DocsParams({ title, params }: { title: string; params: Param[] }) {
	return <>
		<h4 className='docs__panel'><b>{title}</b></h4>
		{params.map(p => <div key={p.name} className='docs__param'>
			<b><code>{p.name}</code></b> <small>{p.type}</small> {p.optional && <i>optional</i>}
			<p>{p.about}</p>
		</div>)}
	</>;
}
