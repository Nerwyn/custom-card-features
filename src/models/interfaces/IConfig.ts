import { IActions } from './IActions';

export interface IConfig {
	type: string;
	styles?: string;
	entries: IEntry[];
}

export interface IEntry
	extends IActions,
		ISliderOptions,
		IDropdownSelectorOptions,
		ISpinboxOptions,
		IToggleOptions {
	type?: TileFeatureType;

	entity_id?: string;
	autofill_entity_id?: boolean;
	value_attribute?: string;
	value_from_hass_delay?: number;

	icon?: string;
	label?: string;
	unit_of_measurement?: string;
	styles?: string;

	haptics?: boolean;
}

export const TileFeatureTypes = [
	'button',
	'dropdown',
	'selector',
	'slider',
	'spinbox',
	'toggle',
] as const;
export type TileFeatureType = (typeof TileFeatureTypes)[number];

export interface IOption extends IEntry {
	option?: string;
}

export interface IDropdownSelectorOptions {
	options?: IOption[];
}

export const SliderThumbTypes = ['default', 'line', 'flat', 'round'] as const;
export const ToggleThumbTypes = [
	'default',
	'md2-switch',
	'md3-switch',
	'checkbox',
] as const;
export type SliderThumbType = (typeof SliderThumbTypes)[number];
export type ToggleThumbType = (typeof ToggleThumbTypes)[number];
export const ThumbTypes = [...SliderThumbTypes, ...ToggleThumbTypes];
export type ThumbType = (typeof ThumbTypes)[number];

export interface ISliderOptions {
	range?: [number, number];
	step?: number;
	thumb?: ThumbType;
}

export interface ISpinboxOptions {
	range?: [number, number];
	step?: number;
	debounce_time?: number;
	increment?: IEntry;
	decrement?: IEntry;
}

export const CheckedValues = ['true', 'yes', 'on', 'enable', 'enabled', '1'];
export const UncheckedValues = [
	'false',
	'no',
	'off',
	'disable',
	'disabled',
	'0',
	'undefined',
	'null',
];

export interface IToggleOptions {
	thumb?: ThumbType;
	checked_icon?: string;
	unchecked_icon?: string;
	checked_values?: string[];
	check_numeric?: boolean;
	allow_list?: boolean;
	swipe_only?: boolean;
	full_swipe?: boolean;
}
