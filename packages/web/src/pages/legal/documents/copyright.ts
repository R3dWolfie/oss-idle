import type { Bilingual } from './types';
import { EMAIL } from '../identity';

export const copyright: Bilingual = {
	en: {
		title: 'Copyright',
		sections: [
			{
				title: 'Maps and music',
				blocks: [
					'The beatmaps played in osu!idle are made by the osu! community, and their music and backgrounds belong to their authors. Maps are ranked here at the request of players and can be removed at any time.',
					'Skins, addons, avatars and banners belong to the players who made or uploaded them.',
				],
			},
			{
				title: 'Asking for removal',
				blocks: [
					`If something on osu!idle infringes your rights, write to ${EMAIL} with:`,
					{
						list: [
							'your name and how to reach you;',
							'the work you own, and proof or a link showing it is yours;',
							'where it is on osu!idle (the page link, or the map\'s name and difficulty);',
							'a statement that you believe in good faith the use is not allowed, and that the information you give is accurate.',
						],
					},
					'We remove the content quickly once the request is complete. If your content was removed and you think it was a mistake, write to the same address.',
				],
			},
		],
	},
	fr: {
		title: 'Droits d\'auteur',
		sections: [
			{
				title: 'Maps et musique',
				blocks: [
					'Les beatmaps jouées dans osu!idle sont créées par la communauté osu!, et leur musique et leurs fonds appartiennent à leurs auteurs. Les maps sont classées ici à la demande des joueurs et peuvent être retirées à tout moment.',
					'Les skins, addons, avatars et bannières appartiennent aux joueurs qui les ont créés ou mis en ligne.',
				],
			},
			{
				title: 'Demander un retrait',
				blocks: [
					`Si un contenu d'osu!idle porte atteinte à vos droits, écrivez à ${EMAIL} en indiquant :`,
					{
						list: [
							'votre nom et comment vous joindre ;',
							'l\'œuvre dont vous êtes titulaire, avec une preuve ou un lien montrant qu\'elle est à vous ;',
							'où elle se trouve sur osu!idle (le lien de la page, ou le nom de la map et de la difficulté) ;',
							'une déclaration indiquant que vous estimez de bonne foi que l\'usage n\'est pas autorisé, et que vos informations sont exactes.',
						],
					},
					'Nous retirons le contenu rapidement une fois la demande complète. Si votre contenu a été retiré et que vous pensez à une erreur, écrivez à la même adresse.',
				],
			},
		],
	},
};
