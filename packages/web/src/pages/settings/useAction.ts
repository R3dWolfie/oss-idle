import { useState } from 'react';

/** Run one request at a time, keeping its error to show. */
export const useAction = () => {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		setError(undefined);
		try {
			await action();
		} catch (e) {
			setError((e as Error).message);
		}
		setBusy(false);
	};
	return {
		busy, error, run,
	};
};

/** The callback URLs as typed, one per line. */
export const callbackUrls = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean);
