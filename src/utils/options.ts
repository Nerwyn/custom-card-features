import { IEntry } from '../models/interfaces';

export const NON_OPTION_ATTRIBUTES = new Set([
	'supported_color_modes',
	'supported_features',
	'device_class',
	'entity_id',
	'lights',
	'device_trackers',
]);

export function getDefaultSelectActionInfo(
	domain: string,
	listAttribute: string,
): Partial<IEntry> | undefined {
	let action: string;
	let key: string;
	let valueAttribute: string | undefined;
	switch (domain) {
		case 'light':
			action = 'turn_on';
			key = 'effect';
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
		tap_action: {
			action: 'perform-action',
			perform_action: `${domain}.${action}`,
			data: {
				[key]: '{{ option }}',
			},
		},
	};
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
