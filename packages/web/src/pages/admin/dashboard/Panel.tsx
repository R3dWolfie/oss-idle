import type { ReactNode } from 'react';

type Props = {
	title: string;
	note?: string;
	children: ReactNode;
};

/** One area of the dashboard: a heading, what it measures, then its charts and tables. */
export default function Panel({
	title, note, children,
}: Props) {
	return (
		<section className='admin-dashboard__section'>
			<h2 className='admin-dashboard__subtitle'>{title}</h2>
			{note && <span className='admin-dashboard__muted'>{note}</span>}
			{children}
		</section>
	);
}
