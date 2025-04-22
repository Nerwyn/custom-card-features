export const Actions = [
	'more-info',
	'toggle',
	'navigate',
	'url',
	'perform-action',
	'assist',
	'fire-dom-event',
	'eval',
	'repeat',
	'none',
] as const;
export type Action = (typeof Actions)[number];

export interface IData {
	[key: string]: string | string[] | number | number[] | boolean;
}

export interface ITarget {
	entity_id?: string | string[];
	device_id?: string | string[];
	area_id?: string | string[];
	label_id?: string | string[];
}

export interface IConfirmation {
	text?: string;
	exemptions?: [{ user: string }];
}

export interface IBrowserMod {
	perform_action?: string;
	data?: IData;
	target?: ITarget;
}

export interface IAction {
	action: Action;

	perform_action?: string;
	data?: IData;
	target?: ITarget;

	navigation_path?: string;
	navigation_replace?: boolean;
	url_path?: string;

	confirmation?: boolean | IConfirmation;

	pipeline_id?: string;
	start_listening?: boolean;

	event_type?: string;
	browser_mod?: IBrowserMod;

	eval?: string;

	hold_time?: number;
	repeat_delay?: number;
	double_tap_window?: number;
}

export interface IActions {
	tap_action?: IAction;
	hold_action?: IAction;
	double_tap_action?: IAction;

	momentary_start_action?: IAction;
	momentary_end_action?: IAction;
}

export const ActionTypes = [
	'tap_action',
	'hold_action',
	'double_tap_action',
	'momentary_start_action',
	'momentary_end_action',
] as const;
export type ActionType = (typeof ActionTypes)[number];
