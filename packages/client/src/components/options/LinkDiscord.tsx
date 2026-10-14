import {
	useEffect,
	useState,
} from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import Auth from '../../online/auth';
import { rpc } from '../../online/client';
import Button from './controls/Button';

const discordLink = async () => {
	const res = await rpc.v1.auth.discord.$get();
	return res.ok ? await res.json() : undefined;
};

/** Links the account's Discord, for the level role on the osu!idle server. */
export default function LinkDiscord() {
	const [user] = useSynced(Auth.user);
	const [linked, setLinked] = useState<boolean>();

	useEffect(() => {
		if (user) void discordLink().then(link => setLinked(link?.linked));
	}, [user]);

	if (!user || linked === undefined) return <></>;

	// A fresh URL per click: its state is single-use and short-lived.
	const open = async () => {
		const link = await discordLink();
		if (link) window.open(link.url, '_blank');
	};

	return (
		<div className="opt-signin">
			<Button
				label={linked ? <Trans>Relink Discord account</Trans> : <Trans>Link Discord account</Trans>}
				accent="#5865f2"
				onClick={() => void open()}
			/>
		</div>
	);
}
