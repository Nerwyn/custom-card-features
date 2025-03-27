import { css, CSSResult, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { DEBOUNCE_TIME } from '../models/constants';
import { BaseCustomFeature } from './base-custom-feature';
import './custom-feature-button';
import { CustomFeatureButton } from './custom-feature-button';

@customElement('custom-feature-spinbox')
export class CustomFeatureSpinbox extends BaseCustomFeature {
	range: [number, number] = [-32768, 32767];
	step: number = 1;
	debounceTimer?: ReturnType<typeof setTimeout>;
	debounceTime: number = DEBOUNCE_TIME;

	holdTimer?: ReturnType<typeof setTimeout>;
	holdInterval?: ReturnType<typeof setInterval>;

	onConfirmationResult(result: boolean) {
		const operators = (this.shadowRoot?.querySelectorAll('.operator') ??
			[]) as BaseCustomFeature[];
		for (const operator of operators) {
			operator.onConfirmationResult(result);
		}
		super.onConfirmationResult(result);
	}

	onPointerDown(e: PointerEvent) {
		super.onPointerDown(e);

		const operator = (e.currentTarget as HTMLElement).id as
			| 'increment'
			| 'decrement';
		if (
			this.renderTemplate(this.config.hold_action?.action ?? 'none') ==
				'repeat' &&
			!this.holdTimer
		) {
			const holdTime = this.config.hold_action?.hold_time
				? (this.renderTemplate(
						this.config[operator]?.hold_action
							?.hold_time as unknown as string,
					) as number)
				: 500;
			this.holdTimer = setTimeout(() => {
				clearTimeout(this.debounceTimer);
				clearTimeout(this.getValueFromHassTimer);
				this.getValueFromHass = false;

				if (!this.swiping) {
					const repeatDelay = this.config.hold_action?.repeat_delay
						? (this.renderTemplate(
								this.config.hold_action
									?.repeat_delay as unknown as string,
							) as number)
						: 100;
					if (!this.holdInterval) {
						this.holdInterval = setInterval(() => {
							this.operateValue(operator);
						}, repeatDelay);
					}
				}
			}, holdTime);
		}
	}

	onPointerUp(e: PointerEvent) {
		clearTimeout(this.debounceTimer);

		if (!this.swiping && this.initialX && this.initialY) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;

			const operator = (e.currentTarget as HTMLElement).id as
				| 'increment'
				| 'decrement';
			this.operateValue(operator);

			this.debounceTimer = setTimeout(async () => {
				await this.sendAction('tap_action');
				this.resetGetValueFromHass();
			}, this.debounceTime);
		}
		this.endAction();
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);

		// Only consider significant enough movement
		const sensitivity = 8;
		const totalDeltaX = (this.currentX ?? 0) - (this.initialX ?? 0);
		const totalDeltaY = (this.currentY ?? 0) - (this.initialY ?? 0);
		if (
			Math.abs(Math.abs(totalDeltaX) - Math.abs(totalDeltaY)) >
			sensitivity
		) {
			this.endAction();
			clearTimeout(this.debounceTimer);
			this.swiping = true;
			this.getValueFromHass = true;
			this.setValue();
		}
	}

	operateValue(operator: 'increment' | 'decrement') {
		const prevValue = parseFloat((this.value ?? this.range[0]) as string);
		let newValue = this.value as number;
		switch (operator) {
			case 'increment':
				newValue = prevValue + this.step;
				break;
			case 'decrement':
				newValue = prevValue - this.step;
				break;
			default:
				break;
		}
		this.value = Math.min(Math.max(newValue, this.range[0]), this.range[1]);
		this.fireHapticEvent('selection');
	}

	endAction() {
		clearTimeout(this.holdTimer);
		clearTimeout(this.holdInterval);
		this.holdTimer = undefined;
		this.holdInterval = undefined;

		super.endAction();
	}

	buildButton(operator: 'increment' | 'decrement') {
		const actions = this.config[operator] ?? {};
		if (!actions.icon) {
			actions.icon = operator == 'increment' ? 'mdi:plus' : 'mdi:minus';
		}
		actions.haptics = actions.haptics ?? this.config.haptics;

		if (
			this.renderTemplate(actions?.tap_action?.action ?? 'none') !=
				'none' ||
			this.renderTemplate(actions?.double_tap_action?.action ?? 'none') !=
				'none' ||
			!['none', 'repeat'].includes(
				this.renderTemplate(
					actions?.hold_action?.action ?? 'none',
				) as string,
			) ||
			this.renderTemplate(
				actions?.momentary_start_action?.action ?? 'none',
			) != 'none' ||
			this.renderTemplate(
				actions?.momentary_end_action?.action ?? 'none',
			) != 'none'
		) {
			return html`
				<custom-feature-button
					id=${operator}
					.hass=${this.hass}
					.config=${actions}
					.shouldRenderRipple=${false}
					@contextMenu=${this.onContextMenu}
				/>
			`;
		} else {
			return html`
				<custom-feature-spinbox-operator-button
					class="operator"
					id="${operator}"
					.hass=${this.hass}
					.config=${actions}
					@pointerdown=${this.onPointerDown}
					@pointerup=${this.onPointerUp}
					@pointermove=${this.onPointerMove}
					@pointercancel=${this.onPointerCancel}
					@pointerleave=${this.onPointerLeave}
					@contextmenu=${this.onContextMenu}
				/>
			`;
		}
	}

	buildLabel(label?: string, context?: object) {
		return this.value != undefined
			? super.buildLabel(label, context)
			: html``;
	}

	buildSpinboxStyles() {
		const styles = `
			${
				this.rtl
					? `
			#decrement {
				left: unset !important;
				right: 0 !important;
			}

			#increment {
				left: 0 !important;
				right: unset !important;
			}
			`
					: ''
			}
		`;

		return html`<style>
			${styles}
		</style>`;
	}

	render() {
		this.setValue();

		if (this.config.range) {
			this.range = [
				parseFloat(
					this.renderTemplate(
						this.config.range[0] as unknown as string,
					) as string,
				),
				parseFloat(
					this.renderTemplate(
						this.config.range[1] as unknown as string,
					) as string,
				),
			];
		}

		if (this.config.step) {
			this.step = parseFloat(
				this.renderTemplate(
					this.config.step as unknown as string,
				) as string,
			);
		}
		const splitStep = this.step.toString().split('.');
		if (splitStep.length > 1) {
			this.precision = splitStep[1].length;
		} else {
			this.precision = 0;
		}

		if (this.config.debounce_time) {
			this.debounceTime = parseFloat(
				this.renderTemplate(
					this.config.debounce_time as unknown as string,
				) as string,
			);
		}

		this.rtl = getComputedStyle(this).direction == 'rtl';

		return html`
			${this.buildBackground()}${this.buildButton('decrement')}
			${this.buildIcon(this.config.icon)}${this.buildLabel(
				this.config.label,
			)}
			${this.buildButton(
				'increment',
			)}${this.buildSpinboxStyles()}${this.buildStyles(
				this.config.styles,
			)}
		`;
	}

	async onKeyDown(e: KeyboardEvent) {
		let button: CustomFeatureButton;
		switch (e.key) {
			case 'ArrowLeft':
				button = this.shadowRoot?.querySelector(
					'custom-feature-button#decrement',
				) as CustomFeatureButton;
				if (button) {
					await button.onKeyDown(
						new window.KeyboardEvent('keydown', {
							...e,
							key: 'Enter',
						}),
					);
				} else {
					e.preventDefault();
					clearTimeout(this.debounceTimer);
					clearTimeout(this.getValueFromHassTimer);
					this.getValueFromHass = false;
					this.operateValue('decrement');
					this.debounceTimer = setTimeout(async () => {
						await this.sendAction('tap_action');
						this.resetGetValueFromHass();
					}, this.debounceTime);
				}
				break;
			case 'ArrowRight':
				button = this.shadowRoot?.querySelector(
					'custom-feature-button#increment',
				) as CustomFeatureButton;
				if (button) {
					await button.onKeyDown(
						new window.KeyboardEvent('keydown', {
							...e,
							key: 'Enter',
						}),
					);
				} else {
					e.preventDefault();
					clearTimeout(this.debounceTimer);
					clearTimeout(this.getValueFromHassTimer);
					this.getValueFromHass = false;
					this.operateValue('increment');
					this.debounceTimer = setTimeout(async () => {
						await this.sendAction('tap_action');
						this.resetGetValueFromHass();
					}, this.debounceTime);
				}
				break;
			default:
				break;
		}
	}

	async onKeyUp(e: KeyboardEvent) {
		let button: CustomFeatureButton;
		switch (e.key) {
			case 'ArrowLeft':
				button = this.shadowRoot?.querySelector(
					'custom-feature-button#decrement',
				) as CustomFeatureButton;
				if (button) {
					await button.onKeyUp(
						new window.KeyboardEvent('keyup', {
							...e,
							key: 'Enter',
						}),
					);
				}
				break;
			case 'ArrowRight':
				button = this.shadowRoot?.querySelector(
					'custom-feature-button#increment',
				) as CustomFeatureButton;
				if (button) {
					await button.onKeyUp(
						new window.KeyboardEvent('keyup', {
							...e,
							key: 'Enter',
						}),
					);
				}
				break;
			default:
				break;
		}
	}

	firstUpdated() {
		super.firstUpdated();
		this.shadowRoot
			?.querySelector('#decrement')
			?.removeAttribute('tabindex');
		this.shadowRoot
			?.querySelector('#increment')
			?.removeAttribute('tabindex');
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					place-content: center;
				}

				.icon-label-container {
					display: flex;
					flex-flow: column;
					align-items: center;
				}

				.icon {
					opacity: 0.77;
				}

				.label {
					width: fit-content;
					font-size: 14px;
					font-weight: 500;
					opacity: 0.77;
				}

				.button {
					position: absolute;
					background: none;
					cursor: pointer;
					display: flex;
					flex-flow: column;
					place-content: center space-evenly;
					align-items: center;
					height: inherit;
					width: initial;
					border: none;
					padding: 10px;
					color: inherit;

					--mdc-icon-size: 16px;
				}

				.button::before {
					display: none !important;
				}

				#decrement {
					left: 0px;
				}

				#increment {
					right: 0px;
				}

				.operator,
				custom-feature-button {
					position: absolute;
					font-size: 14px;
					font-weight: 500;
					opacity: 0.77;
					position: absolute;

					--mdc-icon-size: 16px;
				}

				.operator {
					width: fit-content;
					padding: 0 10px;
					cursor: pointer;

					--background-opacity: 0;
				}

				custom-feature-button {
					min-width: 36px;
					width: min-content;
					padding: 0;

					--opacity: 0;
					--color: rgb(0, 0, 0, 0);
				}
			`,
		];
	}
}

@customElement('custom-feature-spinbox-operator-button')
export class OperatorButton extends BaseCustomFeature {
	render() {
		return html`
			${this.buildBackground()}${this.buildIcon(
				this.config.icon,
			)}${super.buildLabel(this.config.label)}
			${this.buildStyles(this.config.styles)}
		`;
	}
}
