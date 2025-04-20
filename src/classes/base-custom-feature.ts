import {
	Action,
	HapticType,
	HomeAssistant,
	IConfirmation,
	IDialog,
} from '../models/interfaces';

import { renderTemplate } from 'ha-nunjucks';
import { CSSResult, LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { HassEntity } from 'home-assistant-js-websocket';
import { load } from 'js-yaml';
import { UPDATE_AFTER_ACTION_DELAY } from '../models/constants';
import { ActionType, IAction, IActions, IEntry } from '../models/interfaces';
import { MdRipple } from '../models/interfaces/MdRipple';
import { deepGet, deepSet, getDeepKeys } from '../utils';

@customElement('base-custom-feature')
export class BaseCustomFeature extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: IEntry;
	@property() stateObj!: HassEntity;

	@property() shouldRenderRipple = true;
	rippleEndTimer?: ReturnType<typeof setTimeout>;

	@state() value?: string | number | boolean = 0;
	entityId?: string;
	valueAttribute?: string;
	getValueFromHass: boolean = true;
	getValueFromHassTimer?: ReturnType<typeof setTimeout>;
	valueUpdateInterval?: ReturnType<typeof setInterval>;

	unitOfMeasurement: string = '';
	precision?: number;

	momentaryStart?: number;
	momentaryEnd?: number;

	swiping: boolean = false;

	initialX?: number;
	initialY?: number;
	currentX?: number;
	currentY?: number;
	deltaX?: number;
	deltaY?: number;

	@state() featureWidth: number = 0;
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

		this.initialX = undefined;
		this.initialY = undefined;
		this.currentX = undefined;
		this.currentY = undefined;
		this.deltaX = undefined;
		this.deltaY = undefined;
	}

	async sendAction(
		actionType: ActionType,
		actions: IActions = this.config as IActions,
	) {
		let action;
		switch (actionType) {
			case 'momentary_start_action':
				action = actions.momentary_start_action;
				break;
			case 'momentary_end_action':
				action = actions.momentary_end_action;
				break;
			case 'hold_action':
				action = actions.hold_action ?? actions.tap_action;
				break;
			case 'double_tap_action':
				action = actions.double_tap_action ?? actions.tap_action;
				break;
			case 'tap_action':
			default:
				action = actions.tap_action;
				break;
		}

		action &&= this.deepRenderTemplate(action);
		if (!action || !(await this.handleConfirmation(action))) {
			this.dispatchEvent(new CustomEvent('confirmation-failed'));
			return;
		}

		try {
			switch (action.action) {
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
				default:
					break;
			}
		} catch (e) {
			this.endAction();
			throw e;
		}
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
		// eslint-disable-next-line
		// @ts-ignore
		if (this.hass?.auth?.external?.config?.hasAssist) {
			// eslint-disable-next-line
			// @ts-ignore
			this.hass?.auth?.external?.fireMessage({
				type: 'assist/show',
				payload: {
					pipeline_id: action.pipeline_id,
					start_listening: action.start_listening,
				},
			});
		} else {
			window.open(`${window.location.href}?conversation=1`, '_self');
			// TODO figure out how to make this work on desktop browsers
			// const event = new Event('show-dialog', {
			// 	bubbles: true,
			// 	cancelable: true,
			// 	composed: true,
			// });
			// event.detail = {
			// 	dialogTag: 'ha-voice-command-dialog',
			// 	dialogImport: () =>
			// 		Object.getPrototypeOf(
			// 			document.createElement('ha-voice-command-dialog'),
			// 		),
			// 	dialogParams: {
			// 		pipeline_id: pipelineId ?? 'last_used',
			// 		start_listening: startListening ?? false,
			// 	},
			// };
			// this.dispatchEvent(event);
		}
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
		const turnOn = ['closed', 'locked', 'off'].includes(
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

	showDialog(dialogConfig: IDialog) {
		const event = new Event('dialog-show', {
			bubbles: true,
			composed: true,
		});
		event.detail = dialogConfig;
		this.dispatchEvent(event);
	}

	async handleConfirmation(action: IAction): Promise<boolean> {
		if (
			action.confirmation &&
			(!(action.confirmation as IConfirmation).exemptions ||
				!(action.confirmation as IConfirmation).exemptions?.some(
					(e) => e.user == this.hass.user?.id,
				))
		) {
			this.fireHapticEvent('warning');

			let text = (action.confirmation as IConfirmation).text;
			if (!text) {
				let serviceName;
				const [domain, service] = (
					action.perform_action ??
					action['service' as 'perform_action'] ??
					''
				).split('.');
				if (this.hass.services[domain]?.[service]) {
					const localize =
						await this.hass.loadBackendTranslation('title');
					serviceName = `${
						localize(`component.${domain}.title`) || domain
					}: ${
						localize(
							`component.${domain}.services.${service}.name`,
						) ||
						this.hass.services[domain][service].name ||
						service
					}`;
				}

				text = this.hass.localize(
					'ui.panel.lovelace.cards.actions.action_confirmation',
					{
						action:
							serviceName ??
							this.hass.localize(
								`ui.panel.lovelace.editor.action-editor.actions.${action.action}`,
							) ??
							action.action,
					},
				);
			}
			this.showDialog({
				type: 'confirmation',
				text: text,
			});

			return await new Promise((resolve) => {
				const handler = (e: Event) => {
					this.shadowRoot?.removeEventListener(
						'confirmation-result',
						handler,
					);
					resolve(e.detail);
				};
				this.shadowRoot?.addEventListener(
					'confirmation-result',
					handler,
				);
			});
		}
		return true;
	}

	onConfirmationResult(result: boolean) {
		const event = new Event('confirmation-result', {
			bubbles: false,
			composed: false,
		});
		event.detail = result;
		this.shadowRoot?.dispatchEvent(event);
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
			message: this.hass.localize(
				`ui.panel.lovelace.cards.actions.${suffix}`,
			),
		};
		this.dispatchEvent(event);
		this.fireHapticEvent('failure');
	}

	setValue() {
		this.entityId = this.renderTemplate(
			this.config.entity_id as string,
		) as string;

		this.unitOfMeasurement =
			(this.renderTemplate(
				this.config.unit_of_measurement as string,
			) as string) ?? '';

		if (this.getValueFromHass && this.entityId) {
			clearInterval(this.valueUpdateInterval);
			this.valueUpdateInterval = undefined;

			this.valueAttribute = (
				this.renderTemplate(
					(this.config.value_attribute as string) ?? 'state',
				) as string
			).toLowerCase();
			if (!this.hass.states[this.entityId]) {
				this.value = undefined;
			} else if (this.valueAttribute == 'state') {
				this.value = this.hass.states[this.entityId].state;
			} else {
				let value:
					| string
					| number
					| boolean
					| string[]
					| number[]
					| undefined;
				const indexMatch = this.valueAttribute.match(/\[\d+\]$/);
				if (indexMatch) {
					const index = parseInt(indexMatch[0].replace(/\[|\]/g, ''));
					this.valueAttribute = this.valueAttribute.replace(
						indexMatch[0],
						'',
					);
					value =
						this.hass.states[this.entityId].attributes[
							this.valueAttribute
						];
					if (value && Array.isArray(value) && value.length) {
						value = value[index];
					} else {
						value = undefined;
					}
				} else {
					value =
						this.hass.states[this.entityId].attributes[
							this.valueAttribute
						];
				}

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
									if (
										this.hass.states[
											this.entityId as string
										].state == 'playing'
									) {
										this.value = Math.min(
											Math.floor(
												Math.floor(value as number) +
													(Date.now() -
														Date.parse(
															this.hass.states[
																this
																	.entityId as string
															].attributes
																.media_position_updated_at,
														)) /
														1000,
											),
											Math.floor(
												this.hass.states[
													this.entityId as string
												].attributes.media_duration,
											),
										);
									} else {
										this.value = value as number;
									}
								};

								setIntervalValue();
								this.valueUpdateInterval = setInterval(
									setIntervalValue,
									500,
								);
							} catch (e) {
								console.error(e);
								this.value = value as string | number | boolean;
							}
							break;
						case 'elapsed':
							if (this.entityId.startsWith('timer.')) {
								if (
									this.hass.states[this.entityId as string]
										.state == 'idle'
								) {
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
										this.hass.states[
											this.entityId as string
										].attributes.finishes_at,
									);
									try {
										const setIntervalValue = () => {
											if (
												this.hass.states[
													this.entityId as string
												].state == 'active'
											) {
												const remainingSeconds =
													(endSeconds - Date.now()) /
													1000;
												const value = Math.floor(
													durationSeconds -
														remainingSeconds,
												);
												this.value = Math.min(
													value,
													durationSeconds,
												);
											} else {
												const remainingHMS =
													this.hass.states[
														this.entityId as string
													].attributes.remaining.split(
														':',
													);
												const remainingSeconds =
													parseInt(remainingHMS[0]) *
														3600 +
													parseInt(remainingHMS[1]) *
														60 +
													parseInt(remainingHMS[2]);
												this.value = Math.floor(
													durationSeconds -
														remainingSeconds,
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

	renderTemplate(
		str: string | number | boolean,
		context?: object,
	): string | number | boolean {
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
			typeof value == 'number' &&
			this.precision != undefined
		) {
			value = Number(value).toFixed(this.precision);
			context = {
				...context,
				value: value,
			};
		}

		try {
			const res = renderTemplate(this.hass, str as string, context);
			if (res != str) {
				return res;
			}
		} catch (e) {
			console.error(e);
			return '';
		}

		return str;
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

	buildRipple() {
		return this.shouldRenderRipple ? html`<md-ripple></md-ripple>` : '';
	}

	buildStyles(styles?: string, context?: object) {
		const rendered = this.renderTemplate(styles as string, context);
		return rendered
			? html`
					<style>
						${(rendered as string)
							.replace(/ !important/g, '')
							.replace(/;/g, ' !important;')}
					</style>
				`
			: '';
	}

	buildBackground() {
		return html` <div class="background"></div>`;
	}

	buildIcon(icon?: string, context?: object) {
		const rendered = this.renderTemplate(icon as string, context);
		return rendered
			? html`<ha-icon class="icon" .icon=${rendered}></ha-icon>`
			: '';
	}

	buildLabel(label?: string, context?: object) {
		const rendered = this.renderTemplate(label as string, context);
		return rendered ? html`<pre class="label">${rendered}</pre>` : '';
	}

	onPointerDown(e: PointerEvent) {
		if (!this.initialX && !this.initialY) {
			this.swiping = false;
			this.initialX = e.clientX;
			this.initialY = e.clientY;
			this.currentX = e.clientX;
			this.currentY = e.clientY;
			this.deltaX = 0;
			this.deltaY = 0;
		}
	}

	onPointerUp(_e: PointerEvent) {}

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
		const ripple = this.shadowRoot?.querySelector('md-ripple') as MdRipple;
		ripple?.endPressAnimation?.();
		ripple?.startPressAnimation?.(e);
	}

	onTouchEnd(e: TouchEvent) {
		e.preventDefault();

		// Stuck ripple fix
		clearTimeout(this.rippleEndTimer);
		const ripple = this.shadowRoot?.querySelector('md-ripple') as MdRipple;
		this.rippleEndTimer = setTimeout(
			() => ripple?.endPressAnimation?.(),
			100,
		);
	}

	confirmationFailed() {
		clearTimeout(this.getValueFromHassTimer);
		this.getValueFromHass = true;
		this.requestUpdate();
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

	firstUpdated() {
		this.addEventListener('keydown', this.onKeyDown);
		this.addEventListener('keyup', this.onKeyUp);
		this.addEventListener('touchstart', this.onTouchStart);
		this.addEventListener('touchend', this.onTouchEnd);
		this.addEventListener('confirmation-failed', this.confirmationFailed);
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

			.background {
				position: absolute;
				width: 100%;
				height: var(--background-height, 100%);
				background: var(
					--background,
					var(--color, var(--disabled-color))
				);
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
