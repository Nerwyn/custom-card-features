import { CardFeatureType, IEntry } from '../models/interfaces/IConfig';

export function getDefaultStep(min: number, max: number) {
	const range = Number(max) - Number(min);
	if (range > 10) {
		return 1;
	} else if (range > 1) {
		return 0.1;
	} else {
		return 0.01;
	}
}

export function getDefaultValueAttribute(
	featureType: CardFeatureType,
	domain: string,
) {
	switch (featureType) {
		case 'selector':
		case 'dropdown':
			switch (domain) {
				case 'light':
					return 'effect';
				case 'media_player':
					return 'source';
				case 'remote':
					return 'current_activity';
				case 'fan':
					return 'preset_mode';
				case 'humidifier':
					return 'mode';
				case 'vacuum':
					return 'fan_speed';
				default:
					return '';
			}
		case 'spinbox':
		case 'input':
		case 'slider':
			switch (domain) {
				case 'light':
					return 'brightness';
				case 'climate':
					return 'temperature';
				case 'humidifier':
					return 'humidity';
				case 'media_player':
					return 'volume_level';
				default:
					return '';
			}
		default:
			return '';
	}
}

export function getDefaultSelectInfo(
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
					valueAttribute = 'source';
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
				[key]: '{{ option | safe }}',
			},
		},
	};
}
