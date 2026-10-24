import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { SkinCreateBody } from '@oss-idle/shared/skin';
import {
	Skin,
	skinIconUrl,
} from '../../online/skins';
import ListingIcon from '../listing/ListingIcon';

type Shown = Skin | (SkinCreateBody & { authorName?: string });

export default function SkinReadMeta({ skin }: { skin: Shown }) {
	return (
		<>
			<div className='listing-view__head'>
				<ListingIcon url={skinIconUrl(skin.icon)} name={skin.name} />
				<div className='listing-view__headmeta'>
					<div className='listing-view__name'>
						{skin.name}<span className='listing__ver'>v{skin.version}</span>
					</div>
					{skin.authorName && (
						<div className='listing__by'>
							<Trans>by {ph({ author: skin.authorName })}</Trans>
						</div>
					)}
				</div>
			</div>
			{skin.tags.length > 0 && <div className='listing__tags'>
				{skin.tags.map(t => <span key={t} className='listing__tag'>{t}</span>)}
			</div>}
			{skin.description && <p className='listing-view__desc'>{skin.description}</p>}
		</>
	);
}
