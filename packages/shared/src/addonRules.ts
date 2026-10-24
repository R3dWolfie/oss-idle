import { parse } from 'acorn';

/**
 * What an add-on's shipped code may not contain: every direct way to run code that
 * is not in it for players to read (text turned into code, code loaded from
 * elsewhere). Checked on the parsed code, so strings and comments never trip it.
 * The SDK template's ESLint rules mirror this list for authors.
 */

type Node = {
	type: string,
	start: number,
	loc?: { start: { line: number, column: number } },
	[key: string]: unknown,
};

export type AddonViolation = {
	rule: string,
	line: number,
	column: number,
};

const isNode = (value: unknown): value is Node =>
	!!value && typeof value === 'object' && typeof (value as Node).type === 'string';

/** The name of a property access, `a.b` or `a['b']`. */
const propertyName = (node: Node) => {
	if (node.type !== 'MemberExpression') return undefined;
	const property = node.property as Node;
	if (!node.computed && property.type === 'Identifier') return property.name as string;
	if (property.type === 'Literal' && typeof property.value === 'string') return property.value;
	return undefined;
};

/** A string literal's text, or a template's text up to its first `${}`. */
const stringValue = (node: Node | undefined) => {
	if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
	if (node?.type !== 'TemplateLiteral') return undefined;
	const first = (node.quasis as Node[])[0]?.value as { cooked?: string } | undefined;
	return first?.cooked ?? '';
};

const calleeName = (node: Node) => {
	const callee = node.callee as Node;
	return callee.type === 'Identifier' ? callee.name as string : propertyName(callee);
};

const isCall = (node: Node) => node.type === 'CallExpression' || node.type === 'NewExpression';
const args = (node: Node) => node.arguments as Node[];

const BANNED_NAMES = new Set(['eval', 'Function', 'importScripts']);
const BANNED_PROPERTIES = new Set([
	'eval', 'Function', 'importScripts', 'srcdoc', 'createContextualFragment', 'serviceWorker',
]);
const TIMERS = new Set(['setTimeout', 'setInterval', 'setImmediate']);
const ELEMENT_FACTORIES = new Set(['createElement', 'createElementNS']);
const ATTRIBUTE_SETTERS = new Set(['setAttribute', 'setAttributeNS']);
const FUNCTIONS = new Set(['FunctionExpression', 'ArrowFunctionExpression', 'ClassExpression']);

/** Each rule: its message, and whether a node breaks it. */
const RULES: [string, (node: Node) => boolean][] = [
	['eval, Function and importScripts run text as code',
		node => (node.type === 'Identifier' && BANNED_NAMES.has(node.name as string))
			|| BANNED_PROPERTIES.has(propertyName(node) ?? '')],
	['import() and imports load code from elsewhere',
		node => node.type === 'ImportExpression' || node.type === 'ImportDeclaration'
			|| (node.type === 'ExportAllDeclaration')
			|| (node.type === 'ExportNamedDeclaration' && !!node.source)],
	['a timer given a string runs it as code',
		node => isCall(node) && TIMERS.has(calleeName(node) ?? '')
			&& stringValue(args(node)[0]) !== undefined],
	['document.write can load scripts',
		node => (propertyName(node) === 'write' || propertyName(node) === 'writeln')
			&& (node.object as Node).type === 'Identifier' && (node.object as Node).name === 'document'],
	['a script element loads or runs code',
		node => isCall(node) && ELEMENT_FACTORIES.has(calleeName(node) ?? '')
			&& args(node).some(arg => stringValue(arg)?.trim().toLowerCase() === 'script')],
	// a handler written out in the code is readable like the rest (React tests support so)
	['an on… attribute runs its text as code',
		node => isCall(node) && ATTRIBUTE_SETTERS.has(calleeName(node) ?? '')
			&& /^on/i.test(stringValue(args(node).at(-2))?.trim() ?? '')
			&& args(node).at(-1)?.type !== 'Literal'],
	['a javascript: address runs its text as code',
		node => /^\s*javascript:/i.test(stringValue(node) ?? '')],
	// `(() => {}).constructor(text)` is Function; `new event.constructor(type, event)` is fine
	['the constructor of a function builds code from text',
		node => isCall(node) && propertyName(node.callee as Node) === 'constructor'
			&& (FUNCTIONS.has(((node.callee as Node).object as Node).type)
				|| propertyName((node.callee as Node).object as Node) === 'constructor'
				|| args(node).some(arg => stringValue(arg) !== undefined))],
];

/** What the rules forbid, in the words a violation reports: the add-on docs list them. */
export const ADDON_RULES: string[] = RULES.map(([rule]) => rule);

const walk = (node: Node, visit: (node: Node) => void) => {
	visit(node);
	for (const key in node) {
		if (key === 'loc') continue;
		const child = node[key];
		if (Array.isArray(child)) child.forEach(c => isNode(c) && walk(c, visit));
		else if (isNode(child)) walk(child, visit);
	}
};

/** Every rule the code breaks, where; code that does not parse breaks one too. */
export const addonViolations = (source: string): AddonViolation[] => {
	let ast: Node;
	try {
		ast = parse(source, {
			ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true,
		}) as unknown as Node;
	} catch (e) {
		const loc = (e as { loc?: { line: number, column: number } }).loc;
		return [{
			rule: `the code does not parse: ${(e as Error).message}`,
			line: loc?.line ?? 1,
			column: loc?.column ?? 0,
		}];
	}
	const found: AddonViolation[] = [];
	walk(ast, node => {
		for (const [rule, breaks] of RULES) {
			if (breaks(node)) found.push({
				rule, line: node.loc!.start.line, column: node.loc!.start.column,
			});
		}
	});
	return found;
};

/** The violations as one message, at most `max` of them. */
export const describeViolations = (found: AddonViolation[], max = 10) => [
	...found.slice(0, max).map(v => `line ${v.line}:${v.column + 1}: ${v.rule}`),
	...found.length > max ? [`and ${found.length - max} more`] : [],
].join('\n');
