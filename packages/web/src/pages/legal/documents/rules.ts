import type { Bilingual } from './types';

export const rules: Bilingual = {
	en: {
		title: 'Rules',
		sections: [
			{
				title: 'Be nice',
				blocks: [
					{
						list: [
							'No insults, harassment, threats, hate speech or discrimination.',
							'No spam, flooding, or advertising other services.',
							'No sexual, violent or shocking content, in chat or anywhere else.',
							'Do not share someone\'s personal information, including your own address or phone number.',
							'Do not pretend to be someone else, staff included.',
						],
					},
				],
			},
			{
				title: 'Names and images',
				blocks: [
					'Character names, titles, avatars, banners, skins and addons follow the same rules as chat. A name or image that breaks them will be reset.',
				],
			},
			{
				title: 'Play fair',
				blocks: [
					{
						list: [
							'Do not tamper with the game, its requests or its scores, and do not automate what the game does not already do for you.',
							'Do not exploit bugs. If you find one, report it on our Discord: that is always welcome.',
							'One person, one account.',
							'Addons and skins must do what they say and nothing harmful: no stealing data, no hidden code.',
						],
					},
				],
			},
			{
				title: 'What happens if you don\'t',
				blocks: [
					'Depending on how serious it is: a warning, removal of the content, a chat timeout or ban, a progression reset, or the account being restricted or closed. To report a player, use the report button on their profile. To contest a decision, write to the contact address on the Legal Notice page.',
				],
			},
		],
	},
	fr: {
		title: 'Règlement',
		sections: [
			{
				title: 'Restez sympa',
				blocks: [
					{
						list: [
							'Pas d\'insultes, de harcèlement, de menaces, de propos haineux ni de discrimination.',
							'Pas de spam, de flood, ni de publicité pour d\'autres services.',
							'Pas de contenu sexuel, violent ou choquant, dans le chat comme ailleurs.',
							'Ne partagez pas les informations personnelles de quelqu\'un, y compris votre propre adresse ou téléphone.',
							'Ne vous faites pas passer pour quelqu\'un d\'autre, y compris l\'équipe.',
						],
					},
				],
			},
			{
				title: 'Noms et images',
				blocks: [
					'Les noms de personnage, titres, avatars, bannières, skins et addons suivent les mêmes règles que le chat. Un nom ou une image qui les enfreint sera réinitialisé.',
				],
			},
			{
				title: 'Jouez le jeu',
				blocks: [
					{
						list: [
							'Ne modifiez pas le jeu, ses requêtes ou ses scores, et n\'automatisez pas ce que le jeu ne fait pas déjà pour vous.',
							'N\'exploitez pas les bugs. Si vous en trouvez un, signalez-le sur notre Discord : c\'est toujours bienvenu.',
							'Une personne, un compte.',
							'Les addons et skins doivent faire ce qu\'ils annoncent et rien de nuisible : pas de vol de données, pas de code caché.',
						],
					},
				],
			},
			{
				title: 'En cas de manquement',
				blocks: [
					'Selon la gravité : un avertissement, le retrait du contenu, une exclusion temporaire ou définitive du chat, une remise à zéro de la progression, ou la restriction ou la fermeture du compte. Pour signaler un joueur, utilisez le bouton de signalement de son profil. Pour contester une décision, écrivez à l\'adresse de contact des mentions légales.',
				],
			},
		],
	},
};
