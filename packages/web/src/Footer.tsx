import './Footer.css';
import { VERSION } from '@osu-idle/shared/version';
import { Trans } from '@lingui/react/macro';
import Link from './components/Link';

export default function Footer() {
	const years = `2026${(new Date().getFullYear() !== 2026) ? `-${new Date().getFullYear()}` : ''}`;
	return (<footer>
		<div className='footer__links'>
			<Link to='/legal/rules'><Trans>Rules</Trans></Link>
			<Link to='/legal/terms'><Trans>Terms</Trans></Link>
			<Link to='/legal/privacy'><Trans>Privacy</Trans></Link>
			<Link to='/legal/copyright'><Trans>Copyright</Trans></Link>
			<a href="https://github.com/osu-idle/osu-idle"><Trans>Source code</Trans></a>
			<Link to='/legal/notice'><Trans>Legal notice</Trans></Link>
		</div>
		<div className='footer__rg'>
			<a href="https://rhythmgamers.net">rhythmgamers.net</a>
		</div>
		<div className='footer__credits'>
			v{VERSION} | adri powered {years}
		</div>
	</footer>);
}
