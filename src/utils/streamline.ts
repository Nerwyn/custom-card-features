import { DEFAULT_SCHEMA, Type, load } from 'js-yaml';

import { HomeAssistant, IEntry } from '../models/interfaces';

/**
 * Support for `type: custom:streamline-card` feature entries.
 *
 * Streamline Card (https://github.com/brunosabot/streamline-card) lets you
 * define reusable card templates with `[[variable]]` placeholders. This module
 * resolves such templates into concrete feature entries so they can be used
 * inside a custom features row to reduce config duplication. The resolution
 * logic mirrors streamline-card itself (variable substitution, `default`
 * merging, `*_javascript` evaluation and remote `!include` YAML loading) so
 * that existing templates behave identically here.
 */

export const STREAMLINE_CARD_TYPE = 'custom:streamline-card';

export interface IStreamlineEntry extends IEntry {
	type: typeof STREAMLINE_CARD_TYPE;
	template?: string;
	variables?: Record<string, unknown> | Record<string, unknown>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamlineTemplate = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamlineTemplates = Record<string, any>;

/** Window event dispatched when remote templates are (re)loaded. */
export const STREAMLINE_TEMPLATES_UPDATED = 'streamline-templates-updated';

/* -------------------------------------------------------------------------- */
/* Variable formatting and substitution (mirrors streamline-card helpers)      */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatVariables(variables: any): Record<string, any> {
	if (Array.isArray(variables)) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const formatted: Record<string, any> = {};
		for (const variable of variables) {
			for (const [key, value] of Object.entries(variable ?? {})) {
				formatted[key] = value;
			}
		}
		return formatted;
	}
	return variables ?? {};
}

const escapeQuoteRegex = /"/gmu;

function replaceWithKeyValue(
	stringTemplate: string,
	key: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any,
): string {
	if (typeof value === 'number' || typeof value === 'boolean') {
		const rxp = new RegExp(`["'\`]?\\[\\[${key}\\]\\]["'\`]?`, 'gmu');
		return stringTemplate.replaceAll(rxp, String(value));
	} else if (typeof value === 'object') {
		const valueString = JSON.stringify(value);
		const rxpQuotes = new RegExp(`"\\[\\[${key}\\]\\]"`, 'gmu');
		const rxp = new RegExp(`['\`]\\[\\[${key}\\]\\]['\`]`, 'gmu');
		return stringTemplate
			.replaceAll(rxpQuotes, valueString)
			.replaceAll(rxp, valueString.replace(escapeQuoteRegex, '\\"'));
	}
	const rxp = new RegExp(`\\[\\[${key}\\]\\]`, 'gmu');
	return stringTemplate.replaceAll(rxp, String(value));
}

function evaluateVariables(
	templateConfig: StreamlineTemplate,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	variables: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
	const body = templateConfig.card ?? templateConfig.element;
	if (!variables && !templateConfig.default) {
		return structuredClone(body);
	}

	let stringTemplate = JSON.stringify(body);
	const variablesObject = {
		...formatVariables(templateConfig.default ?? {}),
		...formatVariables(variables),
	};
	for (const [key, value] of Object.entries(variablesObject)) {
		stringTemplate = replaceWithKeyValue(stringTemplate, key, value);
	}
	return JSON.parse(stringTemplate);
}

/* -------------------------------------------------------------------------- */
/* `*_javascript` evaluation (mirrors streamline-card helper)                  */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createFunction(code: string): (...args: any[]) => any {
	// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
	return new Function('states', 'user', 'variables', 'areas', code) as (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		...args: any[]
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	) => any;
}

interface JsContext {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	states: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	user: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	variables: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	areas: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processValue(value: any, context: JsContext): any {
	if (typeof value === 'string') {
		const fn = createFunction(value);
		return fn(context.states, context.user, context.variables, context.areas);
	}
	return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processConfig(template: any, context: JsContext): void {
	for (const [key, value] of Object.entries(template)) {
		if (Array.isArray(value)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const newArray: any[] = [];
			for (const item of value) {
				if (typeof item === 'object' && item !== null) {
					processConfig(item, context);
					newArray.push(item);
				} else if (key.endsWith('_javascript')) {
					newArray.push(processValue(item, context));
				} else {
					newArray.push(item);
				}
			}
			if (key.endsWith('_javascript')) {
				template[key.replace('_javascript', '')] = newArray;
				delete template[key];
			} else {
				template[key] = newArray;
			}
		} else if (typeof value === 'object' && value !== null) {
			processConfig(value, context);
		} else if (key.endsWith('_javascript')) {
			template[key.replace('_javascript', '')] = processValue(value, context);
			delete template[key];
		}
	}
}

function templateHasJavascript(templateConfig: StreamlineTemplate): boolean {
	return JSON.stringify(templateConfig).includes('_javascript');
}

/* -------------------------------------------------------------------------- */
/* Remote (file based) template loading with `!include` support                */
/* -------------------------------------------------------------------------- */

const INCLUDE_MARKER = '__streamline_include__';
const includeType = new Type('!include', {
	kind: 'scalar',
	resolve: (data) => typeof data === 'string',
	construct: (data) => ({ [INCLUDE_MARKER]: data }),
});
const STREAMLINE_SCHEMA = DEFAULT_SCHEMA.extend([includeType]);

async function resolveIncludes(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	obj: any,
	baseUrl: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}
	if (Array.isArray(obj)) {
		return Promise.all(obj.map((item) => resolveIncludes(item, baseUrl)));
	}
	if (obj[INCLUDE_MARKER]) {
		const includedPath = obj[INCLUDE_MARKER] as string;
		const base = new URL(baseUrl, window.location.href);
		const url = new URL(includedPath, base).href;
		const res = await fetch(url, { cache: 'reload' });
		if (!res.ok) {
			throw new Error(
				`[custom-card-features] Failed to load included file: ${includedPath}`,
			);
		}
		return evaluateYaml(await res.text(), url);
	}

	const keys = Object.keys(obj);
	const resolved = await Promise.all(
		keys.map((key) => resolveIncludes(obj[key], baseUrl)),
	);
	return Object.fromEntries(keys.map((key, i) => [key, resolved[i]]));
}

async function evaluateYaml(
	yamlString: string,
	baseUrl: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const parsed = load(yamlString, { schema: STREAMLINE_SCHEMA });
	return resolveIncludes(parsed, baseUrl);
}

let remoteTemplates: StreamlineTemplates = {};
let remoteTemplatesPromise: Promise<StreamlineTemplates> | null = null;

async function fetchRemoteTemplates(url: string): Promise<StreamlineTemplates> {
	const res = await fetch(url, { cache: 'reload' });
	if (!res.ok) {
		throw new Error('not found');
	}
	remoteTemplates = (await evaluateYaml(await res.text(), url)) ?? {};
	window.dispatchEvent(new CustomEvent(STREAMLINE_TEMPLATES_UPDATED));
	return remoteTemplates;
}

/**
 * Load file based streamline templates, trying the same locations as
 * streamline-card itself. Cached after the first call.
 */
export function loadStreamlineTemplates(): Promise<StreamlineTemplates> {
	if (!remoteTemplatesPromise) {
		const filename = 'streamline-card/streamline_templates.yaml';
		remoteTemplatesPromise = fetchRemoteTemplates(`/hacsfiles/${filename}`)
			.catch(() => fetchRemoteTemplates(`/local/${filename}`))
			.catch(() => fetchRemoteTemplates(`/local/community/${filename}`))
			.catch(() => remoteTemplates);
	}
	return remoteTemplatesPromise;
}

/* -------------------------------------------------------------------------- */
/* Inline templates (dashboard `streamline_templates` config)                  */
/* -------------------------------------------------------------------------- */

function getLovelaceConfig(): StreamlineTemplate | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let root: any = document.querySelector('home-assistant');
	root = root?.shadowRoot;
	root = root?.querySelector('home-assistant-main');
	root = root?.shadowRoot;
	root = root?.querySelector(
		'app-drawer-layout partial-panel-resolver, ha-drawer partial-panel-resolver',
	);
	root = root?.shadowRoot ?? root;
	root = root?.querySelector('ha-panel-lovelace');
	root = root?.shadowRoot;
	root = root?.querySelector('hui-root');
	return root?.lovelace?.config ?? null;
}

function getInlineTemplates(): StreamlineTemplates {
	return getLovelaceConfig()?.streamline_templates ?? {};
}

/* -------------------------------------------------------------------------- */
/* Public resolution API                                                       */
/* -------------------------------------------------------------------------- */

/** Currently known streamline templates (remote merged with inline). */
function getStreamlineTemplates(): StreamlineTemplates {
	return { ...remoteTemplates, ...getInlineTemplates() };
}

export function isStreamlineType(type?: string): boolean {
	return (type ?? '').toLowerCase() == STREAMLINE_CARD_TYPE;
}

/**
 * Resolve a `custom:streamline-card` entry into one or more concrete feature
 * entries. Returns `null` when the referenced template is not (yet) available,
 * in which case the caller should retry once templates have loaded.
 */
export function resolveStreamlineEntry(
	entry: IStreamlineEntry,
	hass: HomeAssistant,
): IEntry[] | null {
	const name = entry.template;
	if (!name) {
		console.error('[custom-card-features] streamline entry is missing a template');
		return [];
	}

	const templates = getStreamlineTemplates();
	const templateConfig = templates[name];
	if (!templateConfig) {
		// Template not loaded yet (or unknown). Signal the caller to retry.
		return null;
	}

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const resolved: any = evaluateVariables(templateConfig, entry.variables);
		if (
			resolved &&
			typeof resolved === 'object' &&
			hass &&
			templateHasJavascript(templateConfig)
		) {
			const context: JsContext = {
				states: hass.states,
				user: hass.user,
				areas: hass.areas,
				variables: {
					...formatVariables(templateConfig.default ?? {}),
					...formatVariables(entry.variables),
				},
			};
			processConfig(resolved, context);
		}
		const entries = Array.isArray(resolved) ? resolved : [resolved];
		return entries.filter((e) => e != null) as IEntry[];
	} catch (e) {
		console.error(
			`[custom-card-features] failed to resolve streamline template "${name}"`,
			e,
		);
		return [];
	}
}
