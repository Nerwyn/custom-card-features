import { IActions } from './IActions';

export interface ICustomFeatureCardConfig {
	type: string;
	styles?: string;
	feature_height?: number;
	transparent?: boolean;
	features: IConfig[];
}

export interface IConfig {
	type: string;
	styles?: string;
	entries: IEntry[];
}

export interface IEntry
	extends
		IActions,
		IButtonOptions,
		ISliderOptions,
		ICollapsibleSliderOptions,
		IDropdownSelectorOptions,
		ISpinboxOptions,
		IInputOptions,
		IToggleOptions {
	type?: CardFeatureType;

	entity_id?: string;
	autofill_entity_id?: boolean;
	value_attribute?: string;
	value_from_hass_delay?: number;
	value_template?: string;

	icon?: string;
	label?: string;
	unit_of_measurement?: string;
	styles?: string;

	haptics?: boolean;
}

export const CardFeatureTypes = [
	'button',
	'collapsible-slider',
	'dropdown',
	'input',
	'selector',
	'slider',
	'spinbox',
	'toggle',
] as const;
export type CardFeatureType = (typeof CardFeatureTypes)[number];

export interface IOption extends IEntry {
	option?: string;
}

export interface IDropdownSelectorOptions {
	option_type?: OptionType;
	options?: IOption[];
	option_attribute?: string;
	option_entity?: string;
	options_template?: string;
	option_template?: IOption;
}

export const OptionTypes = ['default', 'attribute', 'template'] as const;
export type OptionType = (typeof OptionTypes)[number];

export const ButtonThumbTypes = [
	'default',
	'transparent',
	'tile-icon',
	'md3-elevated',
	'md3-filled',
	'md3-tonal',
	'md3-outlined',
	'md3-text',
	'md3-fab-primary',
	'md3-fab-secondary',
	'md3-fab-tertiary',
	'md3-fab-primary-container',
	'md3-fab-secondary-container',
	'md3-fab-tertiary-container',
] as const;

export const DropdownThumbTypes = [
	'default',
	'md3-standard',
	'md3-vibrant',
	'md3-fab-primary',
	'md3-fab-secondary',
	'md3-fab-tertiary',
] as const;

export const InputTypes = [
	'text',
	'number',
	'date',
	'time',
	'datetime-local',
	'week',
	'month',
	'password',
	'color',
] as const;

export const SelectorThumbTypes = [
	'default',
	'md3-elevated',
	'md3-filled',
	'md3-tonal',
	'md3-outlined',
];

export const SliderThumbTypes = [
	'default',
	'line',
	'flat',
	'round',
	'md3-slider',
] as const;

export const ToggleThumbTypes = [
	'default',
	'md2-switch',
	'md3-switch',
	'checkbox',
] as const;

export type ButtonThumbType = (typeof ButtonThumbTypes)[number];
export type DropdownThumbType = (typeof DropdownThumbTypes)[number];
export type InputType = (typeof InputTypes)[number];
export type SelectorThumbType = (typeof SelectorThumbTypes)[number];
export type SliderThumbType = (typeof SliderThumbTypes)[number];
export type ToggleThumbType = (typeof ToggleThumbTypes)[number];

export const ThumbTypes = [
	...ButtonThumbTypes,
	...DropdownThumbTypes,
	...InputTypes,
	...SelectorThumbTypes,
	...SliderThumbTypes,
	...ToggleThumbTypes,
] as const;
export type ThumbType = (typeof ThumbTypes)[number];

export interface IButtonOptions {
	thumb?: ThumbType;
	toggle_styles?: boolean;
}
export interface ISliderOptions {
	range?: [number, number] | [string, string];
	step?: number;
	thumb?: ThumbType;
	ticks?: boolean;
}

export interface ICollapsibleSliderOptions {
	collapsed?: boolean;
	collapsed_height?: number;
	expanded_height?: number;
	auto_collapse?: boolean | number;
}

export interface ISpinboxOptions {
	range?: [number, number] | [string, string];
	step?: number;
	debounce_time?: number;
	increment?: IEntry;
	decrement?: IEntry;
}

export interface IInputOptions {
	thumb?: ThumbType;
	range?: [number, number] | [string, string];
	step?: number;
}

export const CheckedValues = [
	'true',
	'yes',
	'on',
	'enable',
	'enabled',
	'open',
	'opening',
	'1',
];
export const UncheckedValues = [
	'false',
	'no',
	'off',
	'disable',
	'disabled',
	'closed',
	'closing',
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
