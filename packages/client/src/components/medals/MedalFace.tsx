type Props = {
	bitmap?: string,
	/** the light sweep (left off on a crowded stage) */
	shine: boolean,
	/** hush-hush: a "?" back to flip from */
	secret?: boolean,
};

/** A medal's bitmap with its light sweep, on a face that can flip. */
export default function MedalFace({ bitmap, shine, secret }: Props) {
	const image = bitmap && <img src={bitmap} alt="" draggable={false} />;
	return <div className="medal-tile__flip">
		<div className="medal-tile__face">
			{image}
			{shine && <div className="medal-tile__shine" />}
		</div>
		{secret && <div className="medal-tile__back">
			{image}
			<span>?</span>
		</div>}
	</div>;
}
