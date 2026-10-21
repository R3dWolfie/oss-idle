import './Dashboard.css';

import {
	useEffect,
	useState,
} from 'react';
import {
	type AdminStats,
	getAdminStats,
} from '../../api/admin';

const REFRESH_MS = 30_000;

/** Which game versions players run: web and desktop, over the last 7 days. */
export default function Versions() {
	const [stats, setStats] = useState<AdminStats>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		let alive = true;
		const load = () => getAdminStats()
			.then(s => { if (alive) { setStats(s); setError(undefined); } })
			.catch((e: Error) => { if (alive) setError(e.message); });
		void load();
		const id = setInterval(load, REFRESH_MS);
		return () => { alive = false; clearInterval(id); };
	}, []);

	if (error) {
		return <main className='admin-dashboard'>
			<p className='admin-dashboard__error'>{error}</p>
		</main>;
	}
	if (!stats) {
		return <main className='admin-dashboard'>
			<p className='admin-dashboard__muted'>Loading…</p>
		</main>;
	}

	const total = stats.adoption.reduce((n, v) => n + v.count, 0);
	return (
		<main className='admin-dashboard'>
			<section className='admin-dashboard__section'>
				<h2 className='admin-dashboard__subtitle'>Version adoption</h2>
				<span className='admin-dashboard__muted'>
					Across {total.toLocaleString()} players active in the last 7 days
				</span>
				{total === 0
					? <p className='admin-dashboard__muted'>No version reports yet.</p>
					: <div className='admin-dashboard__adoption'>
						{stats.adoption.map(v => {
							const pct = Math.round((v.count / total) * 100);
							const current = v.version === stats.serverVersion;
							const webPct = (v.web / v.count) * 100;
							return (
								<div key={v.version} className='admin-dashboard__adoption-row'>
									<span className={`admin-dashboard__version ${current ? 'current' : ''}`}>
										{v.version}{current && ' (current)'}
									</span>
									<div className='admin-dashboard__bar'>
										<div
											className={`admin-dashboard__bar-fill ${current ? 'current' : ''}`}
											style={{ width: `${pct}%` }}
										>
											<div
												className='admin-dashboard__bar-seg web'
												style={{ width: `${webPct}%` }}
												title={`Web: ${v.web.toLocaleString()}`}
											/>
											<div
												className='admin-dashboard__bar-seg desktop'
												style={{ width: `${100 - webPct}%` }}
												title={`Desktop: ${v.desktop.toLocaleString()}`}
											/>
										</div>
									</div>
									<span className='admin-dashboard__adoption-count'>
										{v.count.toLocaleString()} · {pct}%
										<span className='admin-dashboard__adoption-split'>
											{v.web.toLocaleString()} web · {v.desktop.toLocaleString()} desktop
										</span>
									</span>
								</div>
							);
						})}
					</div>}
			</section>
		</main>
	);
}
