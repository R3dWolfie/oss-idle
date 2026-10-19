/** The clipboard API needs a secure context (the LAN staging origin isn't one). */
export const copyText = (text: string): void => {
	if (navigator.clipboard) {
		void navigator.clipboard.writeText(text);
		return;
	}
	const field = document.createElement('textarea');
	field.value = text;
	document.body.append(field);
	field.select();
	document.execCommand('copy');
	field.remove();
};
