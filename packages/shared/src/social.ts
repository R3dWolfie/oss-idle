import { z } from 'zod';

/** The signed-in player's social settings. */
export const socialSettingsBody = z.object({
	// unticked: private messages only from the accounts you added
	pmFromAnyone: z.boolean(),
});
export type SocialSettings = z.infer<typeof socialSettingsBody>;

/** osu!web's report reasons, in its order. */
export const REPORT_REASON = ['cheating', 'multiple_accounts', 'chat', 'content', 'other'] as const;
export type ReportReason = typeof REPORT_REASON[number];

export const reportBody = z.object({
	reason: z.enum(REPORT_REASON),
	comment: z.string().trim().max(2000),
});
export type ReportBody = z.infer<typeof reportBody>;
