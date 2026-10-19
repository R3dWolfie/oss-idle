/** What the account history records: osu-web's silence and restriction. */
export const SANCTIONS = ['silence', 'restriction'] as const;
export type Sanction = typeof SANCTIONS[number];

/** One line of the Account Standing. `seconds` 0 lasts until lifted; `actor` only reaches
 *  moderators. */
export type Infringement = {
	id: number;
	action: Sanction;
	reason: string;
	seconds: number;
	at: number;
	actor?: string;
};

export type Standing = {
	/** a timed silence's end */
	silencedUntil?: number;
	/** silenced until lifted */
	silenced: boolean;
	restricted: boolean;
	history: Infringement[];
};
