import { Fragment } from 'react';

const LINK = /(https?:\/\/[^\s,;)]*[^\s,;).]|www\.[^\s,;)]*[^\s,;).]|[\w.+-]+@[\w-]+\.[a-z]{2,})/g;

const href = (part: string) => {
	if (part.includes('@') && !part.startsWith('http')) return `mailto:${part}`;
	return part.startsWith('www.') ? `https://${part}` : part;
};

/** Text with its links and email addresses made clickable. */
export default function LinkedText({ text }: { text: string }) {
	return <>
		{text.split(LINK).map((part, i) => i % 2
			? <a
				key={i}
				href={href(part)}
				target={part.includes('@') ? undefined : '_blank'}
				rel='noreferrer'
			>{part}</a>
			: <Fragment key={i}>{part}</Fragment>)}
	</>;
}
