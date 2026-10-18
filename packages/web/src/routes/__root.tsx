import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	createRootRoute,
	Outlet,
	useRouterState,
} from '@tanstack/react-router';
import Header from '../Header';
import Footer from '../Footer';
import RestrictedBanner from '../components/RestrictedBanner';
import Blackout from '../components/Blackout';
import RouteProgress from '../components/RouteProgress';
import PublicLanding from '../pages/PublicLanding';
import {
	useAuthLoaded,
	useCurrentUser,
} from '../hooks/useCurrentUser';
import useDocumentHead from '../hooks/useDocumentHead';
import useRouteTitle from '../hooks/useRouteTitle';
import { sectionOf } from '../sections';

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
	const user = useCurrentUser();
	const authLoaded = useAuthLoaded();

	const leafId = useRouterState({ select: s => s.matches[s.matches.length - 1]?.routeId });
	const pathname = useRouterState({ select: s => s.location.pathname });
	const onIndex = leafId === '/';
	const title = useRouteTitle();
	const [hue, icon] = sectionOf(pathname);

	useEffect(() => {
		document.documentElement.style.setProperty('--base-hue-override', String(hue));
	}, [hue]);

	// The landing and the preview keep the title and canonical url from index.html.
	useDocumentHead(leafId === '/preview' || (onIndex && !user) ? undefined : title, pathname);

	// The preview route is meant to be embedded in an iframe elsewhere, so it
	// renders on its own without the header, title and footer around it.
	if (leafId === '/preview') return <Outlet />;
	// the API docs are their own page, like osu!'s
	if (leafId === '/docs') return <Outlet />;

	// On the index the signed-out vs signed-in UI diverge entirely; wait for the
	// session so we don't flash the public landing to a signed-in user.
	if (onIndex && !authLoaded) return null;
	if (onIndex && !user) return <PublicLanding />;

	return (<>
		<RouteProgress />
		<Blackout />
		<Header />
		<div className='page'>
			<RestrictedBanner />
			<h1 className='page-title'>
				<FontAwesomeIcon icon={icon} className='page-title__icon' />
				{title}
			</h1>
			<Outlet />
		</div>
		<Footer />
	</>);
}
