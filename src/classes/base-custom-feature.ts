import {
	Action,
	HapticType,
	HomeAssistant,
	StateObj,
} from '../models/interfaces';

import { hasTemplate, renderTemplate } from 'ha-nunjucks';
import { CSSResult, LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { load } from 'js-yaml';
import { AUTOFILL, UPDATE_AFTER_ACTION_DELAY } from '../models/constants';
import {
	ActionType,
	IAction,
	IActions,
	IEntry,
	IOption,
} from '../models/interfaces';
import { MdRipple } from '../models/interfaces/MdRipple';
import {
	buildTemplatedOption,
	deepGet,
	deepSet,
	defaultOptionAction,
	getDeepKeys,
	parseOptionsList,
	resolveOptionsAttribute,
} from '../utils';
import { handleConfirmation } from '../utils/cardHelpers';

@customElement('base-custom-feature')
export class BaseCustomFeature extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: IEntry;
	@property() stateObj?: StateObj;

	@query('md-ripple') ripple?: MdRipple;
	@property() shouldRenderRipple = true;
	rippleEndTimer?: ReturnType<typeof setTimeout>;

	@state() value?: string | number | boolean = 0;
	entityId?: string;
	valueAttribute?: string;
	getValueFromHass: boolean = true;
	getValueFromHassTimer?: ReturnType<typeof setTimeout>;
	valueUpdateInterval?: ReturnType<typeof setInterval>;

	icon: string = '';
	label: string = '';
	styles: string = '';

	unitOfMeasurement: string = '';
	precision?: number;

	momentaryStart?: number;
	momentaryEnd?: number;

	swiping: boolean = false;

	@state() pressed: boolean = false;
	initialX?: number;
	initialY?: number;
	currentX?: number;
	currentY?: number;
	deltaX?: number;
	deltaY?: number;

	rtl: boolean = false;
	tabIndex: number = 0;
	firefox: boolean = /firefox|fxios/i.test(navigator.userAgent);

	fireHapticEvent(haptic: HapticType) {
		if (
			this.renderTemplate(this.config.haptics as unknown as string) ??
			false
		) {
			const event = new Event('haptic', {
				bubbles: true,
				composed: true,
			});
			event.detail = haptic;
			window.dispatchEvent(event);
		}
	}

	endAction() {
		this.momentaryStart = undefined;
		this.momentaryEnd = undefined;

		this.swiping = false;

		this.pressed = false;
		this.initialX = undefined;
		this.initialY = undefined;
		this.currentX = undefined;
		this.currentY = undefined;
		this.deltaX = undefined;
		this.deltaY = undefined;
	}

	getAction(actionType: ActionType, config: IActions = this.config) {
		switch (actionType) {
			case 'momentary_start_action':
				return config.momentary_start_action;
			case 'momentary_repeat_action':
				return config.momentary_repeat_action;
			case 'momentary_end_action':
				return config.momentary_end_action;
			case 'hold_action':
				return config.hold_action ?? config.tap_action;
			case 'double_tap_action':
				return config.double_tap_action ?? config.tap_action;
			case 'tap_action':
			default:
				return config.tap_action;
		}
	}

	async sendAction(actionType: ActionType, config: IActions = this.config) {
		let action = this.getAction(actionType, config);
		action &&= this.deepRenderTemplate(action);
		if (!action || !(await handleConfirmation(this, action))) {
			return;
		}

		try {
			switch (action?.action) {
				case 'navigate':
					this.navigate(action);
					break;
				case 'url':
					this.url(action);
					break;
				case 'assist':
					this.assist(action);
					break;
				case 'more-info':
					this.moreInfo(action);
					break;
				case 'toggle':
					this.toggle(action);
					break;
				case 'call-service' as 'perform-action': // deprecated in 2024.8
				case 'perform-action':
					this.callService(action);
					break;
				case 'fire-dom-event':
					this.fireDomEvent(action);
					break;
				case 'eval':
					this.eval(action);
					break;
				case 'repeat':
				case 'none':
					break;
			}
		} catch (e) {
			this.endAction();
			throw e;
		}
	}

	hassAction(action: IAction) {
		// This normally cannot be used directly, because it fires a haptic event
		// Ignoring the haptic settings of the individual element
		let entity = action.target?.entity_id ?? this.config.entity_id;
		if (Array.isArray(entity)) {
			entity = entity[0];
		}
		action.confirmation = false;

		const event = new Event('hass-action', {
			bubbles: true,
			composed: true,
		});
		event.detail = {
			action: 'tap',
			config: {
				entity,
				tap_action: action,
			},
		};
		this.dispatchEvent(event);
	}

	callService(action: IAction) {
		const performAction =
			action.perform_action ??
			(action['service' as 'perform_action'] as string);

		if (!performAction) {
			this.showFailureToast(action.action);
			return;
		}

		const [domain, service] = performAction.split('.');
		this.hass.callService(domain, service, action.data, action.target);
	}

	navigate(action: IAction) {
		const path = action.navigation_path as string;

		if (!path) {
			this.showFailureToast(action.action);
			return;
		}

		if (path.includes('//')) {
			console.error(
				'Protocol detected in navigation path. To navigate to another website use the action "url" with the key "url_path" instead.',
			);
			return;
		}

		const replace = action.navigation_replace ?? false;
		if (replace == true) {
			window.history.replaceState(
				window.history.state?.root ? { root: true } : null,
				'',
				path,
			);
		} else {
			window.history.pushState(null, '', path);
		}
		const event = new Event('location-changed', {
			bubbles: false,
			cancelable: true,
			composed: false,
		});
		event.detail = { replace: replace == true };
		window.dispatchEvent(event);
	}

	url(action: IAction) {
		let url = action.url_path ?? '';

		if (!url) {
			this.showFailureToast(action.action);
			return;
		}

		if (!url.includes('//')) {
			url = `https://${url}`;
		}
		window.open(url);
	}

	assist(action: IAction) {
		this.hassAction(action);
	}

	moreInfo(action: IAction) {
		const entityId = action.target?.entity_id ?? this.config.entity_id;

		if (!entityId) {
			this.showFailureToast(action.action);
			return;
		}

		const event = new Event('hass-more-info', {
			bubbles: true,
			cancelable: true,
			composed: true,
		});
		event.detail = { entityId };
		this.dispatchEvent(event);
	}

	toggle(action: IAction) {
		const target = {
			...action.data,
			...action.target,
		};

		if (!Object.keys(target).length) {
			this.showFailureToast(action.action);
			return;
		}

		if (Array.isArray(target.entity_id)) {
			for (const entityId of target.entity_id) {
				this.toggleSingle(entityId);
			}
		} else if (target.entity_id) {
			this.toggleSingle(target.entity_id);
		} else {
			this.hass.callService('homeassistant', 'toggle', target);
		}
	}

	toggleSingle(entityId: string) {
		const turnOn = ['closed', 'closing', 'locked', 'off'].includes(
			this.hass.states[entityId].state,
		);
		let domain = entityId.split('.')[0];
		let service: string;
		switch (domain) {
			case 'lock':
				service = turnOn ? 'unlock' : 'lock';
				break;
			case 'cover':
				service = turnOn ? 'open_cover' : 'close_cover';
				break;
			case 'button':
				service = 'press';
				break;
			case 'input_button':
				service = 'press';
				break;
			case 'scene':
				service = 'turn_on';
				break;
			case 'valve':
				service = turnOn ? 'open_valve' : 'close_valve';
				break;
			default:
				domain = 'homeassistant';
				service = turnOn ? 'turn_on' : 'turn_off';
				break;
		}
		this.hass.callService(domain, service, { entity_id: entityId });
	}

	fireDomEvent(action: IAction) {
		const event = new Event(action.event_type ?? 'll-custom', {
			bubbles: true,
			composed: true,
		});
		event.detail = action;
		this.dispatchEvent(event);
	}

	eval(action: IAction) {
		eval(action.eval ?? '');
	}

	showFailureToast(action: Action) {
		let suffix = '';
		switch (action) {
			case 'more-info':
				suffix = 'no_entity_more_info';
				break;
			case 'navigate':
				suffix = 'no_navigation_path';
				break;
			case 'url':
				suffix = 'no_url';
				break;
			case 'toggle':
				suffix = 'no_entity_toggle';
				break;
			case 'perform-action':
			case 'call-service' as 'perform-action':
			default:
				suffix = 'no_action';
				break;
		}
		const event = new Event('hass-notification', {
			bubbles: true,
			composed: true,
		});
		event.detail = {
			message: this.hass.localize(`ui.panel.lovelace.cards.actions.${suffix}`),
		};
		this.dispatchEvent(event);
		this.fireHapticEvent('failure');
	}

	setValue() {
		this.entityId = this.renderTemplate(
			this.config.entity_id as string,
		) as string;

		if (this.getValueFromHass && this.entityId) {
			clearInterval(this.valueUpdateInterval);
			this.valueUpdateInterval = undefined;

			this.valueAttribute = (
				this.renderTemplate(
					(this.config.value_attribute as string) ??
						this.defaultValueAttribute(),
				) as string
			).toLowerCase();
			if (!this.hass.states[this.entityId]) {
				this.value = undefined;
			} else if (this.valueAttribute == 'state') {
				this.value = this.hass.states[this.entityId].state;
			} else {
				const value = deepGet(
					this.hass.states[this.entityId].attributes,
					this.valueAttribute,
				) as string | number | boolean | string[] | number[] | undefined;

				if (value != undefined || this.valueAttribute == 'elapsed') {
					switch (this.valueAttribute) {
						case 'brightness':
							this.value = Math.round(
								(100 * parseInt((value as string) ?? 0)) / 255,
							);
							break;
						case 'media_position':
							try {
								const setIntervalValue = () => {
									if (!this.getValueFromHass) {
										clearInterval(this.valueUpdateInterval);
										this.valueUpdateInterval = undefined;
										return;
									}

									if (
										this.hass.states[this.entityId as string].state == 'playing'
									) {
										this.value = Math.min(
											Math.floor(
												Math.floor(value as number) +
													(Date.now() -
														Date.parse(
															this.hass.states[this.entityId as string]
																.attributes.media_position_updated_at,
														)) /
														1000,
											),
											Math.floor(
												this.hass.states[this.entityId as string].attributes
													.media_duration,
											),
										);
									} else {
										this.value = value as number;
									}
								};

								setIntervalValue();
								this.valueUpdateInterval = setInterval(setIntervalValue, 500);
							} catch (e) {
								console.error(e);
								this.value = value as string | number | boolean;
							}
							break;
						case 'elapsed':
							if (this.entityId.startsWith('timer.')) {
								if (this.hass.states[this.entityId as string].state == 'idle') {
									this.value = 0;
								} else {
									const durationHMS =
										this.hass.states[
											this.entityId as string
										].attributes.duration.split(':');
									const durationSeconds =
										parseInt(durationHMS[0]) * 3600 +
										parseInt(durationHMS[1]) * 60 +
										parseInt(durationHMS[2]);
									const endSeconds = Date.parse(
										this.hass.states[this.entityId as string].attributes
											.finishes_at,
									);
									try {
										const setIntervalValue = () => {
											if (
												this.hass.states[this.entityId as string].state ==
												'active'
											) {
												const remainingSeconds =
													(endSeconds - Date.now()) / 1000;
												const value = Math.floor(
													durationSeconds - remainingSeconds,
												);
												this.value = Math.min(value, durationSeconds);
											} else {
												const remainingHMS =
													this.hass.states[
														this.entityId as string
													].attributes.remaining.split(':');
												const remainingSeconds =
													parseInt(remainingHMS[0]) * 3600 +
													parseInt(remainingHMS[1]) * 60 +
													parseInt(remainingHMS[2]);
												this.value = Math.floor(
													durationSeconds - remainingSeconds,
												);
											}
										};

										setIntervalValue();
										this.valueUpdateInterval = setInterval(
											setIntervalValue,
											500,
										);
									} catch (e) {
										console.error(e);
										this.value = 0;
									}
								}
								break;
							}
						// falls through
						default:
							this.value = value as string | number | boolean;
							break;
					}
				} else {
					this.value = value;
				}
			}
		}
	}

	/**
	 * Options resolved from `config.options`, used by dropdowns and selectors.
	 * When `config.options` is a list it is used directly; when it is a template
	 * string it is rendered, parsed into a list, and one option is generated per
	 * item using `config.option_template`.
	 */
	options: IOption[] = [];
	private optionsSignature?: string;

	/**
	 * Resolve `config.options` into the concrete `options` array.
	 *
	 * Returns whether the resolved options changed and an update is required.
	 * Dynamic sources (attribute or template) are cached on a signature of the
	 * source value so that the (potentially large) list is only rebuilt when the
	 * source actually changes, keeping frequent hass updates cheap.
	 */
	setOptions(): boolean {
		const config = this.config.options;

		// An explicit dynamic source wins over a leftover `options` array, so a
		// config that gained an attribute source (or a non-default optionType) but
		// still carries the old array renders the configured dynamic list instead
		// of the stale array. This mirrors how the editor classifies the source.
		const hasDynamicSource =
			this.config.optionType == 'attribute' ||
			this.config.optionType == 'template' ||
			(this.config.optionType == undefined &&
				(this.config.options_attribute !== undefined ||
					this.config.options_entity !== undefined));

		// Explicit list of options (backwards compatible, unchanged behavior). The
		// signature snapshot detects in-place edits to option objects, which a
		// reference comparison would miss.
		if (Array.isArray(config) && !hasDynamicSource) {
			const signature = `list:${JSON.stringify(config)}`;
			if (signature == this.optionsSignature) {
				return false;
			}
			this.optionsSignature = signature;
			// A shallow copy avoids aliasing the config array.
			this.options = [...(config as IOption[])];
			return true;
		}

		// Dynamic source: an entity attribute or a template that renders to a list.
		const source = this.resolveDynamicOptions();
		if (!source) {
			this.optionsSignature = undefined;
			if (this.options.length) {
				this.options = [];
				return true;
			}
			return false;
		}

		if (source.signature == this.optionsSignature) {
			return false;
		}
		this.optionsSignature = source.signature;
		// Drop only empty items — `0`/`false` are valid option values, so a plain
		// truthiness check would wrongly discard them from numeric/boolean lists.
		this.options = source.items
			.filter((item) => item != null && item !== '')
			.map((item) => this.buildOption(item, source.attribute));
		return true;
	}

	/**
	 * Resolve the `options_attribute`/`options_entity` source into the entity and
	 * attribute to read. A blank `options_attribute:` in YAML is null (not
	 * undefined), so a strict check is used to treat its presence — even when
	 * empty — as opt-in. Returns undefined when no attribute source is configured.
	 */
	private resolveAttributeSource():
		| { entityId: string; attribute: string }
		| undefined {
		// An explicit `optionType` selects the source directly. Without it, infer
		// from the option fields: no attribute source when no attribute fields are
		// set, or when an `options` template is present (it wins over leftover
		// attribute-source fields, so a config containing both renders the template
		// instead of silently reading the attribute).
		const optionType = this.config.optionType;
		if (
			optionType == 'default' ||
			optionType == 'template' ||
			(optionType != 'attribute' &&
				((this.config.options_attribute === undefined &&
					this.config.options_entity === undefined) ||
					(typeof this.config.options == 'string' &&
						this.config.options.trim())))
		) {
			return undefined;
		}
		// Resolve from the current config (not the cached entityId, which is stale
		// after a config-only entity change) and fall back to the feature entity
		// when the source entity is unset or blank (`||`, so '' falls through).
		const entityId = String(
			this.renderTemplate(
				(this.config.options_entity || this.config.entity_id || '') as string,
			),
		);
		const attribute = resolveOptionsAttribute(
			String(
				this.renderTemplate((this.config.options_attribute || '') as string),
			),
			entityId,
		);
		return { entityId, attribute };
	}

	/**
	 * Default value attribute to track for the current options source, so the
	 * selected option is highlighted without configuring `value_attribute`. Falls
	 * back to 'state' when there is no recognized attribute source.
	 */
	private defaultValueAttribute(): string {
		const attrSource = this.resolveAttributeSource();
		if (attrSource?.attribute) {
			// Derive from the controlled (feature) entity's domain, not the source
			// entity's, so a cross-domain source (e.g. an input_select reading a
			// light's effect_list) tracks the feature entity's state instead of an
			// attribute it does not have.
			const featureEntity = String(
				this.renderTemplate((this.config.entity_id ?? '') as string),
			);
			const action = defaultOptionAction(
				featureEntity.split('.')[0],
				attrSource.attribute,
			);
			if (action) {
				return action.value_attribute;
			}
		}
		return 'state';
	}

	/**
	 * Resolve a dynamic options source into a raw list of items plus a cache
	 * signature. Supports reading a list straight from an entity attribute
	 * (`options_attribute`/`options_entity`) and rendering an `options` template
	 * string. Returns undefined when no dynamic source is set.
	 */
	private resolveDynamicOptions():
		| { items: unknown[]; signature: string; attribute?: string }
		| undefined {
		const config = this.config.options;

		// The generated options also depend on the option template and the default
		// action inputs, so they must be part of the cache signature — otherwise an
		// option_template edit that leaves the source list unchanged would not
		// rebuild the resolved options. The feature entity is rendered (not the raw
		// template or the cached entityId) so changing the controlled entity — even
		// via a template whose value changes — invalidates the cache.
		const optionSignature = JSON.stringify([
			this.config.option_template ?? null,
			this.config.autofill_entity_id ?? null,
			String(this.renderTemplate((this.config.entity_id ?? '') as string)),
		]);

		// Attribute source: `options_attribute`/`options_entity`.
		const attrSource = this.resolveAttributeSource();
		if (attrSource) {
			const { entityId, attribute } = attrSource;
			if (!attribute) {
				return undefined;
			}
			const value =
				entityId && this.hass?.states?.[entityId]
					? deepGet(this.hass.states[entityId].attributes, attribute)
					: undefined;
			return {
				items: parseOptionsList(value),
				signature: `attr:${entityId}:${attribute}:${JSON.stringify(value ?? null)}:${optionSignature}`,
				attribute,
			};
		}

		// Template source. Only when the source is a template (explicitly, or
		// inferred when `optionType` is absent), so a stale `options` string left
		// over from another mode is not rendered against the explicit contract.
		if (
			(this.config.optionType == undefined ||
				this.config.optionType == 'template') &&
			typeof config == 'string' &&
			config.trim()
		) {
			const rendered = String(this.renderTemplate(config));
			return {
				items: parseOptionsList(rendered),
				signature: `tmpl:${rendered}:${optionSignature}`,
			};
		}

		return undefined;
	}

	/**
	 * Build a single generated option from a list item, applying the option
	 * template and a default action derived from the source attribute, so that
	 * generating options from common list attributes (effects, sources, modes,
	 * select options, …) works with no action configuration.
	 */
	private buildOption(item: unknown, sourceAttribute?: string): IOption {
		const option = buildTemplatedOption(item, this.config.option_template);

		// The feature entity the action controls. Resolved from the current config
		// (not the cached entityId, which is stale after a config-only change).
		const featureEntity = String(
			this.renderTemplate((this.config.entity_id ?? '') as string),
		);

		// Inherit the parent feature's entity, like the editor autofill does for
		// manual options, so option templates can use `{{ config.entity }}`.
		if (featureEntity && option.entity_id == undefined) {
			option.entity_id = featureEntity;
		}

		// Provide a sensible default action so generating options is zero
		// configuration (mirrors the editor autofill behavior for manual options).
		// The option template can opt out per option with `autofill_entity_id: false`.
		const autofill = this.renderTemplate(
			(option.autofill_entity_id ??
				this.config.autofill_entity_id ??
				AUTOFILL) as unknown as string,
		);
		if (
			autofill &&
			!option.tap_action &&
			!option.double_tap_action &&
			!option.hold_action &&
			!option.momentary_start_action &&
			!option.momentary_repeat_action &&
			!option.momentary_end_action
		) {
			const domain = featureEntity.split('.')[0];
			const action = defaultOptionAction(domain, sourceAttribute ?? '');
			if (action) {
				option.tap_action = {
					action: 'perform-action',
					perform_action: action.perform_action,
					data: { [action.data_key]: option.option },
					target: { entity_id: featureEntity },
				} as IAction;
			}
		}

		return option;
	}

	renderTemplate(
		str: string | number | boolean,
		context?: object,
	): string | number | boolean {
		if (!hasTemplate(str)) {
			return str;
		}

		let holdSecs: number = 0;
		if (this.momentaryStart && this.momentaryEnd) {
			holdSecs = (this.momentaryEnd - this.momentaryStart) / 1000;
		}

		context = {
			value: this.value as string,
			hold_secs: holdSecs,
			unit: this.unitOfMeasurement,
			initialX: this.initialX,
			initialY: this.initialY,
			currentX: this.currentX,
			currentY: this.currentY,
			deltaX: this.deltaX,
			deltaY: this.deltaY,
			// Convenience alias for an option's own value (see issue #198), so that
			// option templates can use `{{ option }}` as well as `{{ config.option }}`.
			option: (this.config as IOption).option,
			config: {
				...this.config,
				entity: this.entityId,
				attribute: this.valueAttribute,
			},
			stateObj: this.stateObj,
			...context,
		};
		context = {
			render: (str2: string) => this.renderTemplate(str2, context),
			...context,
		};

		let value: string | number = context['value' as keyof typeof context];
		if (
			value != undefined &&
			!isNaN(value as number) &&
			(value as string)?.trim?.() != '' &&
			this.precision != undefined
		) {
			value = Number(value).toFixed(this.precision);
			context = {
				...context,
				value: value,
			};
		}

		try {
			return renderTemplate(this.hass, str as string, context, false);
		} catch (e) {
			console.error(e);
			return '';
		}
	}

	deepRenderTemplate<T extends object>(obj: T, context?: object): T {
		const res = structuredClone(obj);
		const keys = getDeepKeys(res);
		for (const key of keys) {
			const prerendered = deepGet(res, key);
			let rendered = this.renderTemplate(
				prerendered as unknown as string,
				context,
			);
			if (
				typeof prerendered === 'string' &&
				(key.endsWith('data') || key.endsWith('target'))
			) {
				rendered = load(rendered as string) as string;
			}
			deepSet(res, key, rendered);
		}
		return res;
	}

	resetGetValueFromHass() {
		const valueFromHassDelay = this.renderTemplate(
			this.config.value_from_hass_delay ?? UPDATE_AFTER_ACTION_DELAY,
		) as number;
		this.getValueFromHassTimer = setTimeout(() => {
			this.getValueFromHass = true;
			this.requestUpdate();
		}, valueFromHassDelay);
	}
	buildIcon(icon?: string) {
		return icon
			? html`<ha-icon class="icon" part="icon" .icon=${icon}></ha-icon>`
			: '';
	}

	buildLabel(label?: string) {
		return label ? html`<pre class="label" part="label">${label}</pre>` : '';
	}

	buildBackground() {
		return html`<div class="background" part="background"></div>`;
	}

	buildRipple() {
		return this.shouldRenderRipple
			? html`<md-ripple part="ripple"></md-ripple>`
			: '';
	}

	onPointerDown(e: PointerEvent) {
		if (!this.initialX && !this.initialY) {
			this.pressed = true;
			this.swiping = false;
			this.initialX = e.clientX;
			this.initialY = e.clientY;
			this.currentX = e.clientX;
			this.currentY = e.clientY;
			this.deltaX = 0;
			this.deltaY = 0;
		}
	}

	onPointerUp(_e: PointerEvent) {
		this.pressed = false;
	}

	onPointerMove(e: PointerEvent) {
		if (this.currentX && this.currentY && e.isPrimary) {
			this.deltaX = e.clientX - this.currentX;
			this.deltaY = e.clientY - this.currentY;
			this.currentX = e.clientX;
			this.currentY = e.clientY;
		}
	}

	onPointerCancel(_e: PointerEvent) {
		this.endAction();
		this.resetGetValueFromHass();
		this.swiping = true;
	}

	onPointerLeave(e: PointerEvent) {
		if (e.pointerType == 'mouse' && this.initialX && this.initialY) {
			this.onPointerCancel(e);
		}
	}

	onContextMenu(e: MouseEvent | PointerEvent) {
		if ((e as PointerEvent).pointerType != 'mouse') {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	onTouchStart(e: TouchEvent) {
		// Stuck ripple fix
		clearTimeout(this.rippleEndTimer);
		this.ripple?.endPressAnimation?.();
		this.ripple?.startPressAnimation?.(e);
	}

	onTouchEnd(e: TouchEvent) {
		// Premature dialog close fix
		e.preventDefault();

		// Stuck ripple fix
		clearTimeout(this.rippleEndTimer);
		this.rippleEndTimer = setTimeout(
			() => this.ripple?.endPressAnimation?.(),
			15,
		);
	}

	async onKeyDown(e: KeyboardEvent) {
		if (!e.repeat && ['Enter', ' '].includes(e.key)) {
			e.preventDefault();
			this.onPointerDown(
				new window.PointerEvent('pointerdown', {
					...e,
					clientX: 1,
					clientY: 1,
				}),
			);
		}
	}

	async onKeyUp(e: KeyboardEvent) {
		if (!e.repeat && ['Enter', ' '].includes(e.key)) {
			e.preventDefault();
			this.onPointerUp(
				new window.PointerEvent('pointerup', {
					...e,
					clientX: 1,
					clientY: 1,
				}),
			);
		}
	}

	shouldUpdate(changedProperties: PropertyValues) {
		if (
			changedProperties.has('hass') ||
			changedProperties.has('stateObj') ||
			changedProperties.has('value') ||
			changedProperties.has('shouldRenderRipple')
		) {
			const value = changedProperties.get('value') || this.value;
			this.setValue();

			this.unitOfMeasurement =
				(this.renderTemplate(
					this.config.unit_of_measurement as string,
				) as string) ?? '';

			const icon = this.renderTemplate(this.config.icon as string) as string;

			const label = this.renderTemplate(this.config.label as string) as string;

			const styles = this.renderTemplate(
				this.config.styles as string,
			) as string;

			if (
				value != this.value ||
				icon != this.icon ||
				label != this.label ||
				styles != this.styles
			) {
				this.icon = icon;
				this.label = label;
				this.styles = styles;
				return true;
			}
		}

		if (
			changedProperties.has('config') &&
			JSON.stringify(this.config) !=
				JSON.stringify(changedProperties.get('config'))
		) {
			return true;
		}

		return (
			changedProperties.size == 0 || // Explicitly request update
			changedProperties.has('value') ||
			changedProperties.has('pressed')
		);
	}

	firstUpdated(_changedProperties: PropertyValues) {
		this.rtl = getComputedStyle(this).direction == 'rtl';
		if (this.rtl) {
			this.setAttribute('dir', 'rtl');
		}
		this.addEventListener('touchstart', this.onTouchStart, {
			passive: true,
		});
		this.addEventListener('touchend', this.onTouchEnd);
		this.addEventListener('keydown', this.onKeyDown);
		this.addEventListener('keyup', this.onKeyUp);
	}

	updated(_changedProperties: PropertyValues) {
		this.setAttribute('value', String(this.value ?? ''));

		if (this.pressed) {
			this.setAttribute('pressed', '');
		} else {
			this.removeAttribute('pressed');
		}
	}

	static get styles(): CSSResult | CSSResult[] {
		return css`
			:host {
				display: flex;
				flex-flow: column;
				place-content: center space-evenly;
				align-items: center;
				position: relative;
				height: var(--feature-height, 40px);
				width: 100%;
				border: none;
				border-radius: var(--feature-border-radius, 12px);
				padding: 0px;
				box-sizing: border-box;
				outline: 0px;
				overflow: hidden;
				font-size: inherit;
				color: inherit;
				flex-basis: 100%;
				transition: box-shadow 180ms ease-in-out;
				-webkit-tap-highlight-color: transparent;
				-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
			}
			:host(:focus-visible) {
				box-shadow: 0 0 0 2px var(--feature-color);
			}

			.container {
				all: inherit;
				overflow: hidden;
				height: 100%;
			}
			:host(:focus-visible) .container {
				box-shadow: none;
			}

			.background {
				position: absolute;
				width: 100%;
				height: var(--background-height, 100%);
				background: var(--background, var(--color, var(--disabled-color)));
				opacity: var(--background-opacity, 0.2);
			}

			.icon {
				position: relative;
				pointer-events: none;
				display: inline-flex;
				flex-flow: column;
				place-content: center;
				color: var(--icon-color, inherit);
				filter: var(--icon-filter, inherit);
			}

			.label {
				position: relative;
				pointer-events: none;
				display: inline-flex;
				justify-content: center;
				align-items: center;
				height: 15px;
				line-height: 15px;
				width: inherit;
				margin: 0;
				font-family: inherit;
				font-size: 12px;
				font-weight: bold;
				color: var(--label-color, inherit);
				filter: var(--label-filter, none);
			}
		`;
	}
}
