/** osu!'s profile lists: 5 first, then 50 per "Show more". One extra row tells whether more are left. */
export const profilePage = async <T>(
	page: number,
	query: (offset: number, limit: number) => PromiseLike<T[]>,
) => {
	const limit = page === 1 ? 5 : 50;
	const rows = await query(page === 1 ? 0 : 5 + ((page - 2) * 50), limit + 1);
	return {
		items: rows.slice(0, limit), hasMore: rows.length > limit, 
	};
};
