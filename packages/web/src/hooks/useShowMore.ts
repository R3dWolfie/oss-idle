import {
	useEffect,
	useRef,
	useState,
	type DependencyList,
} from 'react';

type Page<T> = { items: T[]; hasMore: boolean };

/** A profile list paged osu!-style: page 1 on load, each `more()` appends the next page. */
export const useShowMore = <T>(
	fetchPage: (page: number) => Promise<Page<T>>,
	deps: DependencyList,
) => {
	const [list, setList] = useState<Page<T> & { page: number }>();
	const [loading, setLoading] = useState(false);
	const generation = useRef(0);

	useEffect(() => {
		const gen = ++generation.current;
		setList(undefined);
		setLoading(false);
		void fetchPage(1).then(p => { if (gen === generation.current) setList({
			...p, page: 1, 
		}); });
	}, deps);

	const more = async () => {
		if (!list || loading) return;
		const gen = generation.current;
		setLoading(true);
		const page = list.page + 1;
		const p = await fetchPage(page);
		if (gen !== generation.current) return;
		setList({
			items: [...list.items, ...p.items], hasMore: p.hasMore, page, 
		});
		setLoading(false);
	};

	return {
		items: list?.items, hasMore: !!list?.hasMore, loading, more, 
	};
};
