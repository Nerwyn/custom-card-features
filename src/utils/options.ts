import type { IOption } from '../models/interfaces';

const SELECT_DOMAINS = ['select', 'input_select'];
const PRESET_MODE_DOMAINS = ['climate', 'fan'];
const NON_OPTION_ATTRIBUTES = new Set([
	'supported_color_modes',
	'supported_features',
	'device_class',
	'entity_id',
	'lights',
	'device_trackers',
]);

export function isOptionListAttribute(name: string, value: unknown): boolean {
	return (
		!NON_OPTION_ATTRIBUTES.has(name) &&
		!name.endsWith('_color') &&
		Array.isArray(value) &&
		value.length >= 2
	);
}

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

export function getDefaultSelectActionInfo(
	domain: string,
	listAttribute: string,
) {
	let action: string;
	let key: string;
	let valueAttribute: string | undefined;
	switch (domain) {
		case 'light':
			action = 'turn_on';
			key = 'effect';
			valueAttribute = 'state';
			break;
		case 'media_player':
			switch (listAttribute) {
				case 'sound_mode_list':
					action = 'select_sound_mode';
					key = 'sound_mode';
					break;
				case 'source_list':
				default:
					action = 'select_source';
					key = 'source';
					break;
			}
			break;
		case 'remote':
			action = 'turn_on';
			key = 'current_activity';
			valueAttribute = 'activity';
			break;
		case 'climate':
			switch (listAttribute) {
				case 'preset_modes':
					action = 'set_preset_mode';
					key = 'preset_mode';
					break;
				case 'swing_modes':
					action = 'set_swing_mode';
					key = 'swing_mode';
					break;
				case 'fan_modes':
					action = 'set_fan_mode';
					key = 'fan_mode';
					break;
				case 'hvac_modes':
				default:
					action = 'set_hvac_mode';
					key = 'hvac_mode';
					valueAttribute = 'state';
					break;
			}
			break;
		case 'fan':
			action = 'set_preset_mode';
			key = 'mode';
			valueAttribute = 'preset_mode';
			break;
		case 'humidifier':
			action = 'set_mode';
			key = 'mode';
			break;
		case 'water_heater':
			action = 'set_operation_mode';
			key = 'operation_mode';
			valueAttribute = 'state';
			break;
		case 'vacuum':
			action = 'set_fan_speed';
			key = 'fan_speed';
			break;
		case 'select':
		case 'input_select':
			action = 'select_option';
			key = 'option';
			valueAttribute = 'state';
			break;
		default:
			return undefined;
	}

	return {
		value_attribute: valueAttribute || key,
		action: {
			action: 'perform-action',
			perform_action: `${domain}.${action}`,
			data: {
				[key]: '{{ value }}',
			},
		},
	};
}

export interface IOptionAction {
	perform_action: string;
	data_key: string;
	value_attribute: string;
}

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

export function defaultOptionAction(
	domain: string,
	attribute: string,
): IOptionAction | undefined {
	if (attribute == 'preset_modes') {
		return PRESET_MODE_DOMAINS.includes(domain)
			? {
					perform_action: `${domain}.set_preset_mode`,
					data_key: 'preset_mode',
					value_attribute: 'preset_mode',
				}
			: undefined;
	}
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
	const action = OPTION_ACTIONS[attribute];
	if (action && action.perform_action.split('.')[0] != domain) {
		return undefined;
	}
	return action;
}

const DEFAULT_ACTION_DATA_KEYS = new Map<string, string>([
	...Object.values(OPTION_ACTIONS).map(
		(action) => [action.perform_action, action.data_key] as [string, string],
	),
	['climate.set_preset_mode', 'preset_mode'],
	['fan.set_preset_mode', 'preset_mode'],
	['select.select_option', 'option'],
	['input_select.select_option', 'option'],
]);

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

export function unescapeHtml(str: string): string {
	const htmlEntities: Record<string, string> = {
		'&quot;': '"',
		'&#34;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&#x27;': "'",
		'&lt;': '<',
		'&gt;': '>',
		'&amp;': '&',
	};

	return str.replace(
		/&quot;|&#34;|&#39;|&apos;|&#x27;|&lt;|&gt;|&amp;/g,
		(match) => htmlEntities[match],
	);
}

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

	const unescaped = unescapeHtml(rendered).trim();
	if (!unescaped) {
		return [];
	}
	const separator = unescaped.includes('\n') ? '\n' : ',';
	return unescaped
		.split(separator)
		.map((item) => item.trim())
		.filter((item) => item.length);
}

export function buildTemplatedOption(
	item: unknown,
	template?: IOption | null,
): IOption {
	const option: IOption = structuredClone(template ?? {});

	let value: unknown = item;
	let label: unknown;
	let icon: unknown;
	if (item != null && typeof item == 'object') {
		const record = item as Record<string, unknown>;
		label = record.label || record.name || record.friendly_name || record.title;
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
