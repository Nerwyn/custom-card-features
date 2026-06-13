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
		IDropdownSelectorOptions,
		ISpinboxOptions,
		IInputOptions,
		IToggleOptions {
	type?: CardFeatureType;

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

export const CardFeatureTypes = [
	'button',
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
	/**
	 * Which source the dropdown/selector builds its options from, set by the
	 * editor's "Options source" picker:
	 * - `list`: an explicit list of option objects in `options` (the default).
	 * - `attribute`: a list read from `options_attribute`/`options_entity`.
	 * - `template`: an `options` template string that renders to a list.
	 *
	 * When omitted (e.g. a hand-written config) the source is inferred from the
	 * shape of the other option fields.
	 */
	optionType?: 'list' | 'attribute' | 'template';

	/**
	 * The options to list out: either an explicit list of options (the original
	 * behavior) or a template string that renders to a list. To read a list from
	 * an entity attribute, use {@link IDropdownSelectorOptions.options_attribute}.
	 *
	 * When a template or attribute source is used, one option is generated per
	 * list item using {@link IDropdownSelectorOptions.option_template}.
	 */
	options?: IOption[] | string;

	/**
	 * Read the options list directly from this attribute of the feature entity
	 * (or {@link IDropdownSelectorOptions.options_entity}). A declarative
	 * alternative to an `options` template, e.g. `options_attribute: effect_list`.
	 * For select/input_select entities this defaults to `options`.
	 */
	options_attribute?: string;

	/**
	 * Entity to read {@link IDropdownSelectorOptions.options_attribute} from.
	 * Defaults to the feature's `entity_id`.
	 */
	options_entity?: string;

	/**
	 * Template applied to every option generated from a template string,
	 * attribute source, or a list of primitive values. Each item's value is
	 * exposed to its templates as `option` (and `config.option`).
	 */
	option_template?: IOption;
}

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
