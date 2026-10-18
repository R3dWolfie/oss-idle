import { i18n } from '@lingui/core';

export const euros = (cents: number): string =>
	new Intl.NumberFormat(i18n.locale, {
		style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: cents % 100 ? 2 : 0,
	}).format(cents / 100);
