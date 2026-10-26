// The picker's sections, by the game's emoji names (the server's list has no groups). A name missing here,
// a supporter's own included, shows under its own section, so a new emoji never goes missing.

export const EMOJI_GROUPS = [
	{
		key: 'people', icon: 'slight_smile', names: [
			'grin', 'smile', 'laughing', 'joy', 'rofl', 'sweat_smile', 'slight_smile', 'upside_down', 'wink',
			'blush', 'innocent', 'heart_eyes', 'star_struck', 'kissing_heart', 'yum', 'stuck_out_tongue_winking_eye',
			'zany_face', 'money_mouth', 'hugging', 'face_with_hand_over_mouth', 'shushing_face', 'thinking',
			'neutral_face', 'expressionless', 'no_mouth', 'smirk', 'unamused', 'rolling_eyes', 'grimacing',
			'relieved', 'pensive', 'sleepy', 'sleeping', 'mask', 'thermometer_face', 'nauseated_face', 'hot_face',
			'cold_face', 'woozy_face', 'exploding_head', 'cowboy', 'partying_face', 'cool', 'sunglasses', 'nerd',
			'confused', 'worried', 'slight_frown', 'open_mouth', 'astonished', 'flushed', 'pleading_face',
			'fearful', 'cold_sweat', 'cry', 'sob', 'scream', 'confounded', 'persevere', 'disappointed', 'weary',
			'tired_face', 'yawning_face', 'triumph', 'rage', 'angry', 'skull', 'skull_crossbones', 'poop', 'clown',
			'ghost', 'alien', 'robot', 'smiley_cat', 'heart_eyes_cat', 'see_no_evil', 'hear_no_evil',
			'speak_no_evil', 'wave', 'raised_hand', 'ok_hand', 'pinching_hand', 'v', 'fingers_crossed', 'metal',
			'call_me', 'point_left', 'point_right', 'point_up', 'point_down', 'thumbsup', 'thumbsdown', 'fist',
			'punch', 'clap', 'raised_hands', 'open_hands', 'handshake', 'pray', 'muscle', 'brain', 'eyes', 'eye',
			'tongue', 'lips', 'baby', 'man', 'woman', 'older_man', 'person_bowing', 'person_facepalming',
			'person_shrugging', 'dancer', 'man_dancing',
		],
	},
	{
		key: 'nature', icon: 'sunflower', names: [
			'monkey', 'dog', 'wolf', 'fox', 'cat', 'unicorn', 'bear', 'panda_face', 'bird', 'penguin', 'frog',
			'cherry_blossom', 'rose', 'sunflower', 'sunny', 'cloud', 'rainbow', 'umbrella2', 'zap', 'snowflake',
			'fire', 'ocean', 'star', 'star2', 'sparkles', 'dizzy', 'boom', 'dash', 'sweat_drops',
		],
	},
	{
		key: 'food', icon: 'pizza', names: ['hamburger', 'fries', 'pizza', 'cookie', 'cake', 'birthday', 'coffee', 'beers'],
	},
	{
		key: 'activities', icon: 'soccer', names: [
			'tada', 'confetti_ball', 'balloon', 'gift', 'trophy', 'first_place', 'second_place', 'third_place',
			'military_medal', 'soccer', 'basketball', 'dart', 'video_game', 'joystick', 'game_die',
		],
	},
	{
		key: 'travel', icon: 'red_car', names: ['red_car', 'airplane', 'rocket', 'map', 'checkered_flag', 'triangular_flag_on_post'],
	},
	{
		key: 'objects', icon: 'gem', names: [
			'crown', 'gem', 'headphones', 'microphone', 'musical_note', 'notes', 'guitar', 'drum', 'computer',
			'keyboard', 'trackball', 'alarm_clock', 'hourglass', 'bell', 'moneybag', 'chart_with_upwards_trend',
			'chart_with_downwards_trend', 'key', 'lock', 'hammer', 'bomb',
		],
	},
	{
		key: 'symbols', icon: 'heart', names: [
			'heart', 'orange_heart', 'yellow_heart', 'green_heart', 'blue_heart', 'purple_heart', 'black_heart',
			'white_heart', 'broken_heart', 'two_hearts', 'heartpulse', 'sparkling_heart', 'anger', 'zzz', '100',
			'exclamation', 'question', 'warning', 'white_check_mark', 'x', 'heavy_plus_sign', 'heavy_minus_sign',
			'recycle', 'arrow_up', 'arrow_down', 'arrow_left', 'arrow_right', 'new', 'up', 'ok', 'sos',
		],
	},
] as const;

export type EmojiGroupKey = typeof EMOJI_GROUPS[number]['key'];

const GROUP_OF = new Map<string, EmojiGroupKey>(
	EMOJI_GROUPS.flatMap(g => g.names.map(n => [n, g.key] as const)),
);

/** The section an emoji's name belongs to, if the table knows it. */
export const groupOf = (name: string): EmojiGroupKey | undefined =>
	GROUP_OF.get(name);
