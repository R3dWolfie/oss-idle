import {
	useMemo,
	type CSSProperties,
} from 'react';

type Props = {
	count?: number,
	/** px the farthest particle travels */
	reach?: number,
};

export default function MedalBurst({
	count = 14, reach = 260,
}: Props) {
	const particles = useMemo(() => Array.from({ length: count }, (_, i) => {
		const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
		const distance = reach * (0.45 + Math.random() * 0.55);
		return {
			'--dx': `${Math.cos(angle) * distance}px`,
			'--dy': `${Math.sin(angle) * distance}px`,
			'--spin': `${Math.round(Math.random() * 540 - 270)}deg`,
			'--size': `${4 + Math.random() * 7}px`,
			'--delay': `${Math.random() * 90}ms`,
		} as CSSProperties;
	}), [count, reach]);

	return <div className="medal-burst">
		{particles.map((style, i) => <span key={i} style={style} />)}
	</div>;
}
