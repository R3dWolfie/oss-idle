import type { NewsDTO } from '@osu-idle/shared/news';
import Link from './Link';
import { i18n } from '../i18n';

/** A collapsed dashboard news post: day, month and title on one line, like osu!web's. */
export default function NewsRow({ article }: { article: NewsDTO }) {
	const date = article.publishedAt ? new Date(article.publishedAt) : undefined;
	return <Link to='/news/$slug' params={{ slug: article.slug }} className='news-row'>
		<span className='news-row__date'>
			{date && <>
				<b>{date.getDate()}</b>&nbsp;{date.toLocaleDateString(i18n.locale, { month: 'short' })}
			</>}
		</span>
		<span className='news-row__title'>{article.title}</span>
	</Link>;
}
