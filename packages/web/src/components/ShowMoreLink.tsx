import './ShowMoreLink.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { Trans } from '@lingui/react/macro';

export default function ShowMoreLink({ hasMore, loading, onClick }: {
	hasMore: boolean;
	loading: boolean;
	onClick: () => void;
}) {
	if (!hasMore && !loading) return null;
	return (
		<button type='button' className='show-more-link' disabled={loading} onClick={onClick}>
			<FontAwesomeIcon icon={faAngleDown} className='show-more-link__icon' />
			<span className='show-more-link__text'><Trans>Show more</Trans></span>
			<FontAwesomeIcon icon={faAngleDown} className='show-more-link__icon' />
		</button>
	);
}
