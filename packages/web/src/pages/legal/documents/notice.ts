import type { Bilingual } from './types';
import {
	ADDRESS,
	EMAIL,
	HOST,
	PUBLISHER,
	SIRET,
	STATUS,
} from '../identity';

export const notice: Bilingual = {
	en: {
		title: 'Legal Notice',
		sections: [
			{
				title: 'Publisher',
				blocks: [
					{
						list: [
							`${PUBLISHER}, ${STATUS}`,
							`Address: ${ADDRESS}`,
							`SIRET: ${SIRET}`,
							'VAT not applicable, article 293 B of the French General Tax Code',
							`Contact: ${EMAIL}`,
							`Publication director: ${PUBLISHER}`,
						],
					},
				],
			},
			{
				title: 'Hosting',
				blocks: [HOST],
			},
			{
				title: 'Not affiliated with osu!',
				blocks: [
					'osu!idle is an unofficial fan game, not made, endorsed or supported by ppy Pty Ltd. osu! is a trademark of ppy Pty Ltd.',
				],
			},
			{
				title: 'Credits',
				blocks: [
					{
						list: [
							'IP Geolocation by DB-IP (https://db-ip.com), licensed under CC BY 4.0.',
							'World map from Natural Earth (https://www.naturalearthdata.com), public domain.',
							'The source code of osu!idle is published under the GNU AGPL v3: https://github.com/osu-idle/osu-idle',
						],
					},
				],
			},
		],
	},
	fr: {
		title: 'Mentions légales',
		sections: [
			{
				title: 'Éditeur',
				blocks: [
					{
						list: [
							`${PUBLISHER}, ${STATUS}`,
							`Adresse : ${ADDRESS}`,
							`SIRET : ${SIRET}`,
							'TVA non applicable, article 293 B du CGI',
							`Contact : ${EMAIL}`,
							`Directeur de la publication : ${PUBLISHER}`,
						],
					},
				],
			},
			{
				title: 'Hébergement',
				blocks: [HOST],
			},
			{
				title: 'Aucun lien avec osu!',
				blocks: [
					'osu!idle est un jeu de fan non officiel, ni réalisé, ni approuvé, ni soutenu par ppy Pty Ltd. osu! est une marque de ppy Pty Ltd.',
				],
			},
			{
				title: 'Crédits',
				blocks: [
					{
						list: [
							'Géolocalisation IP par DB-IP (https://db-ip.com), sous licence CC BY 4.0.',
							'Carte du monde issue de Natural Earth (https://www.naturalearthdata.com), domaine public.',
							'Le code source d\'osu!idle est publié sous licence GNU AGPL v3 : https://github.com/osu-idle/osu-idle',
						],
					},
				],
			},
		],
	},
};
