import { load } from 'js-yaml';
import type { IOption } from '../models/interfaces';

const SELECT_DOMAINS = ['select', 'input_select'];

// Domains that provide a set_preset_mode service for the preset_modes attribute.
const PRESET_MODE_DOMAINS = ['climate', 'fan', 'humidifier'];

// List-valued attributes that describe capabilities/metadata rather than
// selectable options, so they are not offered as an options source.
const NON_OPTION_ATTRIBUTES = new Set([
	'supported_color_modes',
	'supported_features',
	'device_class',
	'entity_id',
	'lights',
	'device_trackers',
]);

/**
 * Whether an entity attribute is usable as an options source: a list of more
 * than one item that is not a color tuple (`hs_color`, `rgb_color`, …, whose
 * numbers are channel values, not options) or a known capability/metadata
 * attribute. Other numeric lists are allowed — numbers are valid option values.
 */
export function isOptionListAttribute(name: string, value: unknown): boolean {
	return (
		!NON_OPTION_ATTRIBUTES.has(name) &&
		!name.endsWith('_color') &&
		Array.isArray(value) &&
		value.length >= 2
	);
}

/**
 * Resolve which entity attribute an attribute-sourced options list should be
 * read from. When no attribute is given, select/input_select entities default
 * to their `options` attribute so that generating options from them is zero
 * configuration; other domains require an explicit attribute.
 */
export function resolveOptionsAttribute(
	attribute: string | undefined,
	entityId: string | undefined,
): string {
	if (attribute) {
		return attribute;
	}
	const domain = (entityId ?? '').split('.')[0];
	return SELECT_DOMAINS.includes(domain) ? 'options' : '';
}

/**
 * How to apply and reflect a selection for an attribute-sourced option list:
 * the service to call, the data key to set, and the feature attribute that
 * reflects the current selection (so it can be highlighted).
 */
export interface IOptionAction {
	perform_action: string;
	data_key: string;
	value_attribute: string;
}

// The list attribute a feature sources its options from also tells us how to
// apply a selection and which attribute reflects it. Mapped here so generating
// options from these attributes works with no action configuration.
const OPTION_ACTIONS: Record<string, IOptionAction> = {
	effect_list: {
		perform_action: 'light.turn_on',
		data_key: 'effect',
		value_attribute: 'effect',
	},
	source_list: {
		perform_action: 'media_player.select_source',
		data_key: 'source',
		value_attribute: 'source',
	},
	sound_mode_list: {
		perform_action: 'media_player.select_sound_mode',
		data_key: 'sound_mode',
		value_attribute: 'sound_mode',
	},
	activity_list: {
		perform_action: 'remote.turn_on',
		data_key: 'activity',
		value_attribute: 'current_activity',
	},
	hvac_modes: {
		perform_action: 'climate.set_hvac_mode',
		data_key: 'hvac_mode',
		value_attribute: 'state',
	},
	fan_modes: {
		perform_action: 'climate.set_fan_mode',
		data_key: 'fan_mode',
		value_attribute: 'fan_mode',
	},
	swing_modes: {
		perform_action: 'climate.set_swing_mode',
		data_key: 'swing_mode',
		value_attribute: 'swing_mode',
	},
	available_modes: {
		perform_action: 'humidifier.set_mode',
		data_key: 'mode',
		value_attribute: 'mode',
	},
	operation_list: {
		perform_action: 'water_heater.set_operation_mode',
		data_key: 'operation_mode',
		value_attribute: 'state',
	},
	fan_speed_list: {
		perform_action: 'vacuum.set_fan_speed',
		data_key: 'fan_speed',
		value_attribute: 'fan_speed',
	},
};

/**
 * Default action for an option generated from a given entity attribute, so that
 * tapping an option applies the selection without any action configuration.
 * Returns undefined when there is no sensible default for the domain/attribute.
 */
export function defaultOptionAction(
	domain: string,
	attribute: string,
): IOptionAction | undefined {
	// preset_modes is shared by climate, fan, and humidifier. Only those domains
	// provide set_preset_mode, so a feature controlling another domain (e.g. an
	// input_select sourcing preset_modes via options_entity) gets no default.
	if (attribute == 'preset_modes') {
		return PRESET_MODE_DOMAINS.includes(domain)
			? {
					perform_action: `${domain}.set_preset_mode`,
					data_key: 'preset_mode',
					value_attribute: 'preset_mode',
				}
			: undefined;
	}
	// select/input_select, including the no-attribute (template source) case.
	// The selected option is the entity state.
	if (
		SELECT_DOMAINS.includes(domain) &&
		(attribute == 'options' || !attribute)
	) {
		return {
			perform_action: `${domain}.select_option`,
			data_key: 'option',
			value_attribute: 'state',
		};
	}
	// Attribute-specific services (e.g. effect_list -> light.turn_on) only make
	// sense when the controlled entity is in that service's domain. When the list
	// is sourced from a different-domain entity (via options_entity), targeting
	// the feature entity with that service would be invalid, so require a custom
	// action instead of generating a broken default.
	const action = OPTION_ACTIONS[attribute];
	if (action && action.perform_action.split('.')[0] != domain) {
		return undefined;
	}
	return action;
}

// The exact data key a default option action sets, per service, used to tell an
// auto-filled default action apart from a user customized one (which may reuse
// the same service with a different data key, e.g. light.turn_on + brightness).
const DEFAULT_ACTION_DATA_KEYS = new Map<string, string>([
	...Object.values(OPTION_ACTIONS).map(
		(action) => [action.perform_action, action.data_key] as [string, string],
	),
	['climate.set_preset_mode', 'preset_mode'],
	['fan.set_preset_mode', 'preset_mode'],
	['humidifier.set_preset_mode', 'preset_mode'],
	['select.select_option', 'option'],
	['input_select.select_option', 'option'],
]);

/**
 * Whether an action looks like an auto-filled option default (a known default
 * service whose only data is that service's expected key set to the
 * `{{ option }}` template) rather than a customized action, so it can be safely
 * regenerated when the source changes.
 */
export function isManagedDefaultAction(
	performAction: string | undefined,
	data: Record<string, unknown> | undefined,
): boolean {
	const expectedKey = performAction
		? DEFAULT_ACTION_DATA_KEYS.get(performAction)
		: undefined;
	if (!expectedKey) {
		return false;
	}
	const keys = data ? Object.keys(data) : [];
	return (
		keys.length == 1 &&
		keys[0] == expectedKey &&
		data?.[expectedKey] == '{{ option }}'
	);
}

/**
 * Decode the handful of HTML entities that nunjucks autoescaping introduces.
 * `ha-nunjucks` renders with autoescaping enabled, so a template like
 * `{{ my_list | dump }}` resolves to `[&quot;a&quot;,&quot;b&quot;]`. Decoding
 * these lets us parse the result back into JSON.
 */
export function unescapeHtml(str: string): string {
	return str
		.replace(/&quot;/g, '"')
		.replace(/&#34;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

/**
 * Coerce the rendered result of an `options` template into an array of items.
 *
 * Templates that resolve to a list can be expressed in several ways, all of
 * which are supported here:
 * - A native array (when the renderer hands one back directly).
 * - A JSON or YAML array string, e.g. from `{{ my_list | dump }}` (with or
 *   without HTML escaping) or a hand written `["a", "b"]`.
 * - A plain delimited string, e.g. the default `{{ state_attr(...) }}` output
 *   `a,b,c`, or a newline separated list.
 *
 * Each returned item is either a primitive (string/number) or an object that
 * {@link buildTemplatedOption} maps into an option.
 */
export function parseOptionsList(rendered: unknown): unknown[] {
	if (Array.isArray(rendered)) {
		return rendered;
	}
	if (rendered == null) {
		return [];
	}
	if (typeof rendered != 'string') {
		return [rendered];
	}

	const trimmed = rendered.trim();
	if (!trimmed) {
		return [];
	}

	// Structured list (JSON/YAML), optionally HTML escaped by the templater.
	// JSON is attempted before YAML because YAML treats the `&` in HTML entities
	// (e.g. `&quot;`) as an anchor and would mis-parse an escaped JSON array.
	const unescaped = unescapeHtml(trimmed);
	const looksJson = /^[[{]/.test(trimmed) || /^[[{]/.test(unescaped);
	// A YAML block sequence starts each item with `- ` (e.g. `- Solid\n- Rainbow`).
	const looksYamlSequence = /^-(\s|$)/m.test(trimmed);
	if (looksJson || looksYamlSequence) {
		const parsers = looksJson ? [tryParseJson, tryParseYaml] : [tryParseYaml];
		for (const parser of parsers) {
			for (const candidate of [unescaped, trimmed]) {
				const parsed = parser(candidate);
				if (Array.isArray(parsed)) {
					return parsed;
				}
			}
		}
	}

	// Plain delimited list, split on the decoded string so that autoescaped
	// values (e.g. `R&amp;B`) become their real value. Newlines take precedence
	// over commas so that values containing commas can still be expressed with a
	// `join('\n')` template.
	const separator = unescaped.includes('\n') ? '\n' : ',';
	return unescaped
		.split(separator)
		.map((item) => item.trim())
		.filter((item) => item.length);
}

/** Parse a string as JSON, returning undefined instead of throwing on failure. */
function tryParseJson(str: string): unknown {
	try {
		return JSON.parse(str);
	} catch {
		return undefined;
	}
}

/** Parse a string as YAML, returning undefined instead of throwing on failure. */
function tryParseYaml(str: string): unknown {
	try {
		return load(str);
	} catch {
		return undefined;
	}
}

/**
 * Build a single option from a templated list item and an optional per-option
 * template. The item's value is always written to the option's `option` field
 * so that selected state detection and the `option`/`config.option` template
 * variables (see issue #198) resolve to the item's value.
 *
 * List items may be primitives (`"Solid"`) or objects describing the option
 * (`{ value, label, icon }`, with `option`/`id`/`name`/`friendly_name`/`title`
 * accepted as aliases). Explicit `label`/`icon` from the item only apply when
 * the template does not already set them, so the template stays in control.
 */
export function buildTemplatedOption(
	item: unknown,
	template?: IOption | null,
): IOption {
	// A blank `option_template:` in YAML is null, so coalesce to an empty object.
	const option: IOption = structuredClone(template ?? {});

	let value: unknown = item;
	let label: unknown;
	let icon: unknown;
	if (item != null && typeof item == 'object') {
		const record = item as Record<string, unknown>;
		// `||` so a blank string falls through to the next alias rather than
		// becoming an empty label.
		label = record.label || record.name || record.friendly_name || record.title;
		// Fall back to the label aliases for the value so that an item providing
		// only e.g. `name` is still selectable, not given an empty option value.
		value =
			record.value ?? record.option ?? record.id ?? record.key ?? label ?? '';
		icon = record.icon;
	}

	option.option = String(value);
	if (label && option.label == undefined) {
		option.label = String(label);
	}
	if (icon != undefined && option.icon == undefined) {
		option.icon = String(icon);
	}

	return option;
}
