import type { PrivateMessage as Message } from '@oss-idle/shared/community/wire';
import {
	DAO,
	integer,
	table,
	text,
} from '../dao';

/** Private message history. The server keeps none: this is the only copy, per
 *  device, per signed-in account. */
const t = table('private_message', {
	id:      text().primaryKey(),
	account: integer(),
	contact: integer(),
	fromId:  integer(),
	name:    text(),
	color:   text(),
	text:    text(),
	at:      integer(),
}, { indexes: { idx_private_message_conversation: 'account, contact, at' } });

export default class PrivateMessage extends DAO(t) {

	static save(account: number, contact: number, m: Message): Promise<PrivateMessage> {
		return new PrivateMessage({
			id: m.id,
			account,
			contact,
			fromId: m.from.userId,
			name: m.from.name,
			color: m.from.color,
			text: m.text,
			at: m.at,
		}).add();
	}

	/** One conversation, oldest first. */
	static conversation(account: number, contact: number): Promise<PrivateMessage[]> {
		return this.query(
			'SELECT * FROM private_message WHERE account = ? AND contact = ? ORDER BY at',
			[account, contact],
		);
	}
}
