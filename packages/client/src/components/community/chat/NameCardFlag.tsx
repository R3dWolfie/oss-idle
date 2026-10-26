import { useState } from 'react';

import { SITE_URL } from '../../../globals';

/** The country's flag, from the site's set; none when it has no image for it. */
export default function NameCardFlag({ country }: { country: string }) {
	const [failed, setFailed] = useState(false);
	if (!country || failed) return null;
	return (
		<img
			className="name-card__flag"
			src={`${SITE_URL}/web/img/flags/${country.toUpperCase()}.png`}
			alt={country}
			onError={() => setFailed(true)}
		/>
	);
}
