import {
	isAdmin,
	isModerator,
} from '@oss-idle/shared/groups';
import { useCurrentUser } from './useCurrentUser';

export function useAdmin(): boolean {
	return isAdmin(useCurrentUser()?.groups);
}

/** Admins and the GMT: sanctions and reports. */
export function useModerator(): boolean {
	return isModerator(useCurrentUser()?.groups);
}
