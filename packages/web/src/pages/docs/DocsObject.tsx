import type { ObjectDoc } from './content';

/** An object's fields, as osu!'s Object Structures list them. */
export default function DocsObject({ object }: { object: ObjectDoc }) {
	return <>
		<h2 id={object.id}>{object.title}</h2>
		<p>{object.about}</p>
		<table>
			<thead>
				<tr><th>Field</th><th>Type</th><th>Description</th></tr>
			</thead>
			<tbody>
				{object.fields.map(([name, type, about]) => <tr key={name}>
					<td>{name}</td><td>{type}</td><td>{about}</td>
				</tr>)}
			</tbody>
		</table>
	</>;
}
