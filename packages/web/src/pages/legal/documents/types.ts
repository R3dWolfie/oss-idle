/** A paragraph, a bullet list, or a small heading. Links and emails are made clickable. */
export type Block = string | { list: string[] } | { sub: string };

export type Section = {
	title: string;
	blocks: Block[];
};

export type LegalText = {
	title: string;
	sections: Section[];
};

export type Bilingual = {
	en: LegalText;
	fr: LegalText;
};
