import { connect } from 'node:tls';

// Stalwart's folder with the \Sent role
const SENT = 'Sent Items';

/** Files a message in the sender's Sent folder over IMAP, with the SMTP login: an SMTP
 *  submission keeps no copy. */
export const fileSent = (smtpUrl: string, raw: Buffer) => new Promise<void>((resolve, reject) => {
	const url = new URL(smtpUrl);
	const user = decodeURIComponent(url.username);
	const login = Buffer.from(`\0${user}\0${decodeURIComponent(url.password)}`);
	const socket = connect({
		host: url.hostname, port: 993, servername: url.hostname,
	});
	socket.setTimeout(15_000, () => socket.destroy(new Error('IMAP timed out')));
	socket.on('error', reject);
	let buffered = '';
	let step: 'greeting' | 'auth' | 'append' | 'done' = 'greeting';
	const onLine = (line: string) => {
		if (step === 'greeting' && line.startsWith('* OK')) {
			step = 'auth';
			socket.write('a AUTHENTICATE PLAIN\r\n');
		} else if (step === 'auth' && line.startsWith('+')) {
			socket.write(`${login.toString('base64')}\r\n`);
		} else if (step === 'auth' && line.startsWith('a OK')) {
			step = 'append';
			socket.write(`b APPEND "${SENT}" (\\Seen) {${raw.length}}\r\n`);
		} else if (step === 'append' && line.startsWith('+')) {
			socket.write(raw);
			socket.write('\r\n');
		} else if (step === 'append' && line.startsWith('b OK')) {
			step = 'done';
			socket.end('c LOGOUT\r\n');
			resolve();
		} else if (/^(\* BYE|[ab] (NO|BAD))/.test(line)) {
			socket.destroy();
			reject(new Error(`IMAP: ${line}`));
		}
	};
	socket.on('data', (chunk: Buffer) => {
		buffered += chunk.toString('latin1');
		const lines = buffered.split('\r\n');
		buffered = lines.pop() ?? '';
		lines.forEach(onLine);
	});
});
