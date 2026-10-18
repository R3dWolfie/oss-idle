import Link from '../Link';

/** Covers a score card with a link to the score's page; the card's own links stay on top. */
export default function ScoreLink({ id, label }: { id: number; label: string }) {
	return <Link
		to='/scores/$id'
		params={{ id: String(id) }}
		className='score-link'
		aria-label={label}
	/>;
}
