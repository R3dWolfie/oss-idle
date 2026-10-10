import {
	useNavigate,
	useSearch,
} from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { Filter } from './LeaderboardFilters';

/** osu!web's SHOW All / Friends switch for a leaderboard, signed-in only. */
export const useFriendsFilter = (): Filter | undefined => {
	const { t } = useLingui();
	const me = useCurrentUser();
	const navigate = useNavigate();
	const { friends } = useSearch({ strict: false });
	if (!me) return undefined;
	return {
		label: t`show`,
		type: 'toggle',
		selected: friends ? 'friends' : 'all',
		items: [
			{
				value: 'all', label: t`All`,
			},
			{
				value: 'friends', label: t`Friends`,
			},
		],
		onSelection: item => void navigate({
			to: '.',
			search: prev => ({
				...prev, friends: item.value === 'friends' || undefined, page: 1,
			}),
		}),
	};
};
