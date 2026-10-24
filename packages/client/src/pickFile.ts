/** Ask the player for files; none when they cancel. */
export const pickFiles = (accept: string, multiple = true): Promise<File[]> =>
	new Promise(resolve => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = accept;
		input.multiple = multiple;
		input.onchange = () => resolve([...input.files ?? []]);
		input.oncancel = () => resolve([]);
		input.click();
	});

/** Ask the player for a file; undefined when they cancel. */
export const pickFile = async (accept: string): Promise<File | undefined> =>
	(await pickFiles(accept, false))[0];

/** Ask the player for a folder: every file in it, named from the folder (`Skin/a.png`). */
export const pickFolder = (): Promise<File[]> =>
	new Promise(resolve => {
		const input = document.createElement('input');
		input.type = 'file';
		input.webkitdirectory = true;
		input.onchange = () => resolve([...input.files ?? []]);
		input.oncancel = () => resolve([]);
		input.click();
	});
