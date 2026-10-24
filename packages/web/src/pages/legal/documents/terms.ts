import type { Bilingual } from './types';
import {
	EMAIL,
	MEDIATOR,
	PUBLISHER,
	SITE,
} from '../identity';

export const terms: Bilingual = {
	en: {
		title: 'Terms of Service',
		sections: [
			{
				title: '1. Who we are',
				blocks: [
					`oss!idle (${SITE}, the game, the website and the desktop app) is run by ${PUBLISHER}, an individual entrepreneur in France. The full legal details are on the Legal Notice page. Contact: ${EMAIL}.`,
					'oss!idle is an unofficial fan game. It is not made, endorsed or supported by ppy Pty Ltd, the company behind osu!. "osu!" is their trademark.',
					'By using oss!idle you accept these terms, the Rules and the Privacy Policy. If you do not accept them, do not use oss!idle.',
				],
			},
			{
				title: '2. Your account',
				blocks: [
					'You can play as a guest without an account. To play online you sign in with your osu! account: oss!idle only receives your osu! id, username, avatar and country, never your password.',
					'You must be at least 13 years old to sign in. If you live in France and are under 15, a parent or guardian must agree to it. A purchase needs the agreement of whoever owns the means of payment.',
					'You are responsible for what happens on your account. Tell us at once if you think someone else is using it.',
					'You can ask us to delete your account at any time by writing to the contact address (see the Privacy Policy).',
				],
			},
			{
				title: '3. The game',
				blocks: [
					'oss!idle is free to play. Every feature that affects the game stays free.',
					'Scores, levels, rankings and the rest of your progression are game data, not property. We may rebalance the game, recompute or remove scores (for example when a map is unranked), and reset progression obtained through a bug or a breach of the Rules.',
					'We try to keep oss!idle running, but we cannot promise it will always be available, error-free, or that a feature will last. We may change or stop parts of it.',
				],
			},
			{
				title: '4. What you share',
				blocks: [
					'You keep the rights to what you create: character names, avatars, banners, chat messages, skins and addons. You allow us to store, display and share it inside oss!idle for as long as it is online, so that the service works (a skin you publish can be downloaded by other players, for example).',
					'You must have the right to share what you upload. Do not upload anything that breaks the Rules or someone else\'s rights. Addons run code on other players\' devices: an addon must do what it says and nothing harmful. We do not review addons before they are published: whoever publishes an addon is responsible for what it does.',
					'We may remove content that breaks these terms or the Rules. To report content that infringes your rights, see the Copyright page.',
				],
			},
			{
				title: '5. Rules and sanctions',
				blocks: [
					'Using oss!idle means following the Rules. If you break them we may delete content, mute you in chat, or restrict or close your account, depending on how serious it is. You can contest a decision by writing to the contact address.',
				],
			},
			{
				title: '6. Supporter tags (terms of sale)',
				blocks: [
					{ sub: 'What you buy' },
					'A supporter tag helps pay for the servers. While it is active it gives: a heart on your profile, a yellow name in chat, a heart in the main menu and a custom main menu background through your skin. It gives no advantage in the game. The current list is on the store page.',
					'The tag belongs to the account it is bought for (yours, or another player\'s for a gift) and cannot be moved to another account once it is delivered.',
					{ sub: 'Price and payment' },
					'Prices are in euros, all taxes included. VAT not applicable, article 293 B of the French General Tax Code. The price and the matching duration are shown before you pay; a longer duration costs less per month.',
					'Payment is handled by Stripe. oss!idle never sees your card details. The order is confirmed once Stripe confirms the payment.',
					{ sub: 'Delivery' },
					'The tag is delivered to the account right after payment. Buying while a tag is active adds the new time to the time left.',
					{ sub: 'Automatic renewal' },
					'If you choose to renew automatically, the same amount is charged again at the end of each period for the same duration, until you cancel. You can cancel at any time in a few clicks with the Manage subscriptions button on the store page: the tag then runs until the end of the period already paid, and nothing more is charged.',
					{ sub: 'Withdrawal right' },
					'The supporter tag is digital content supplied right away. Before paying, you ask for it to start at once and acknowledge that you therefore lose your 14-day withdrawal right (article L221-28 13° of the French Consumer Code). This also applies to each renewal.',
					{ sub: 'Guarantee and refunds' },
					'If the tag is not delivered or does not work as described, write to us and we will fix it or refund you, as the law requires (legal guarantee of conformity for digital content, articles L224-25-12 and following of the French Consumer Code). Apart from that, a tag that has started is not refunded.',
					'A tag lost because the account was closed for breaking the Rules is not refunded, unless the law requires otherwise.',
					{ sub: 'Disputes' },
					MEDIATOR
						? `Write to ${EMAIL} first: most problems are solved that way. If we cannot agree, you can turn to the consumer mediator free of charge: ${MEDIATOR}.`
						: `Write to ${EMAIL} first: most problems are solved that way.`,
				],
			},
			{
				title: '7. Liability',
				blocks: [
					'oss!idle is provided as it is. We are not liable for indirect damage, for the loss of game data, or for what other players or third-party services (osu!, Discord, Stripe) do. Nothing here limits the rights you have as a consumer, or our liability where the law does not allow it to be limited.',
				],
			},
			{
				title: '8. Changes',
				blocks: [
					'We may update these terms. The date at the top tells you when they last changed; important changes are announced in the news. A purchase stays under the terms that applied when you made it.',
				],
			},
			{
				title: '9. Law',
				blocks: [
					'These terms are under French law. As a consumer, you keep the protection of the law of the country where you live, and you can go to the courts there.',
				],
			},
		],
	},
	fr: {
		title: 'Conditions d\'utilisation',
		sections: [
			{
				title: '1. Qui sommes-nous',
				blocks: [
					`oss!idle (${SITE}, le jeu, le site et l'application de bureau) est édité par ${PUBLISHER}, entrepreneur individuel en France. Les informations légales complètes sont dans les mentions légales. Contact : ${EMAIL}.`,
					'oss!idle est un jeu de fan non officiel. Il n\'est ni réalisé, ni approuvé, ni soutenu par ppy Pty Ltd, la société derrière osu!. « osu! » est leur marque.',
					'En utilisant oss!idle, vous acceptez ces conditions, le règlement et la politique de confidentialité. Si vous ne les acceptez pas, n\'utilisez pas oss!idle.',
				],
			},
			{
				title: '2. Votre compte',
				blocks: [
					'Vous pouvez jouer en invité sans compte. Pour jouer en ligne, vous vous connectez avec votre compte osu! : oss!idle reçoit seulement votre identifiant osu!, votre pseudo, votre avatar et votre pays, jamais votre mot de passe.',
					'Vous devez avoir au moins 13 ans pour vous connecter. En France, avant 15 ans, l\'accord d\'un parent ou tuteur est nécessaire. Un achat nécessite l\'accord du titulaire du moyen de paiement.',
					'Vous êtes responsable de ce qui se passe sur votre compte. Prévenez-nous tout de suite si vous pensez que quelqu\'un d\'autre l\'utilise.',
					'Vous pouvez nous demander de supprimer votre compte à tout moment en écrivant à l\'adresse de contact (voir la politique de confidentialité).',
				],
			},
			{
				title: '3. Le jeu',
				blocks: [
					'oss!idle est gratuit. Toutes les fonctionnalités qui ont un effet sur le jeu restent gratuites.',
					'Les scores, niveaux, classements et le reste de votre progression sont des données de jeu, pas une propriété. Nous pouvons rééquilibrer le jeu, recalculer ou retirer des scores (par exemple quand une map n\'est plus classée), et réinitialiser une progression obtenue grâce à un bug ou en violation du règlement.',
					'Nous faisons de notre mieux pour qu\'oss!idle reste en ligne, mais nous ne pouvons pas garantir qu\'il soit toujours disponible, sans erreur, ni qu\'une fonctionnalité dure. Nous pouvons en modifier ou en arrêter certaines parties.',
				],
			},
			{
				title: '4. Ce que vous partagez',
				blocks: [
					'Vous gardez vos droits sur ce que vous créez : noms de personnage, avatars, bannières, messages, skins et addons. Vous nous autorisez à les stocker, les afficher et les partager dans oss!idle tant qu\'ils sont en ligne, pour que le service fonctionne (un skin que vous publiez peut être téléchargé par d\'autres joueurs, par exemple).',
					'Vous devez avoir le droit de partager ce que vous mettez en ligne. Ne publiez rien qui enfreigne le règlement ou les droits d\'autrui. Les addons exécutent du code sur les appareils des autres joueurs : un addon doit faire ce qu\'il annonce, et rien de nuisible. Nous ne vérifions pas les addons avant leur publication : celui qui publie un addon est responsable de ce qu\'il fait.',
					'Nous pouvons retirer un contenu qui enfreint ces conditions ou le règlement. Pour signaler un contenu qui porte atteinte à vos droits, voir la page droits d\'auteur.',
				],
			},
			{
				title: '5. Règlement et sanctions',
				blocks: [
					'Utiliser oss!idle, c\'est respecter le règlement. En cas de manquement, nous pouvons supprimer un contenu, vous rendre muet dans le chat, ou restreindre ou fermer votre compte, selon la gravité. Vous pouvez contester une décision en écrivant à l\'adresse de contact.',
				],
			},
			{
				title: '6. Tags supporter (conditions générales de vente)',
				blocks: [
					{ sub: 'Ce que vous achetez' },
					'Un tag supporter aide à payer les serveurs. Tant qu\'il est actif, il donne : un cœur sur votre profil, un pseudo jaune dans le chat, un cœur dans le menu principal et un fond de menu personnalisé via votre skin. Il ne donne aucun avantage dans le jeu. La liste à jour est sur la page de la boutique.',
					'Le tag appartient au compte pour lequel il est acheté (le vôtre, ou celui d\'un autre joueur pour un cadeau) et ne peut pas être transféré à un autre compte une fois livré.',
					{ sub: 'Prix et paiement' },
					'Les prix sont en euros, toutes taxes comprises. TVA non applicable, article 293 B du CGI. Le prix et la durée correspondante sont affichés avant le paiement ; une durée plus longue coûte moins cher par mois.',
					'Le paiement est géré par Stripe. oss!idle n\'a jamais accès à vos données de carte. La commande est confirmée dès que Stripe confirme le paiement.',
					{ sub: 'Livraison' },
					'Le tag est livré sur le compte juste après le paiement. Un achat alors qu\'un tag est actif ajoute la nouvelle durée au temps restant.',
					{ sub: 'Renouvellement automatique' },
					'Si vous choisissez le renouvellement automatique, le même montant est débité à la fin de chaque période pour la même durée, jusqu\'à ce que vous résiliez. Vous pouvez résilier à tout moment en quelques clics avec le bouton de gestion des abonnements de la boutique : le tag court alors jusqu\'à la fin de la période déjà payée, et plus rien n\'est débité.',
					{ sub: 'Droit de rétractation' },
					'Le tag supporter est un contenu numérique fourni immédiatement. Avant de payer, vous demandez qu\'il commence tout de suite et reconnaissez perdre ainsi votre droit de rétractation de 14 jours (article L221-28 13° du Code de la consommation). Cela vaut aussi pour chaque renouvellement.',
					{ sub: 'Garantie et remboursements' },
					'Si le tag n\'est pas livré ou ne fonctionne pas comme décrit, écrivez-nous : nous le corrigerons ou vous rembourserons, comme le prévoit la loi (garantie légale de conformité des contenus numériques, articles L224-25-12 et suivants du Code de la consommation). En dehors de ce cas, un tag commencé n\'est pas remboursé.',
					'Un tag perdu parce que le compte a été fermé pour non-respect du règlement n\'est pas remboursé, sauf si la loi en dispose autrement.',
					{ sub: 'Litiges' },
					MEDIATOR
						? `Écrivez d'abord à ${EMAIL} : la plupart des problèmes se règlent ainsi. Si nous ne trouvons pas d'accord, vous pouvez recourir gratuitement au médiateur de la consommation : ${MEDIATOR}.`
						: `Écrivez d'abord à ${EMAIL} : la plupart des problèmes se règlent ainsi.`,
				],
			},
			{
				title: '7. Responsabilité',
				blocks: [
					'oss!idle est fourni en l\'état. Nous ne sommes pas responsables des dommages indirects, de la perte de données de jeu, ni de ce que font les autres joueurs ou les services tiers (osu!, Discord, Stripe). Rien ici ne limite vos droits de consommateur, ni notre responsabilité là où la loi interdit de la limiter.',
				],
			},
			{
				title: '8. Modifications',
				blocks: [
					'Nous pouvons mettre à jour ces conditions. La date en haut indique leur dernière modification ; les changements importants sont annoncés dans les actualités. Un achat reste soumis aux conditions en vigueur au moment où il a été fait.',
				],
			},
			{
				title: '9. Droit applicable',
				blocks: [
					'Ces conditions sont soumises au droit français. En tant que consommateur, vous conservez la protection de la loi du pays où vous résidez et pouvez saisir les tribunaux de ce pays.',
				],
			},
		],
	},
};
