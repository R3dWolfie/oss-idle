import Synced from '@osu-idle/shared/helpers/synced';
import type { MedalBatch } from '@osu-idle/shared/play';
import Socket from './socket';

/** Medals the server awarded away from a result screen, shown wherever we are. */
export const pushedMedals = new Synced<MedalBatch | undefined>(undefined);

Socket.on('medals', msg => void pushedMedals.set(msg.medals));
