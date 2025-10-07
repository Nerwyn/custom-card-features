import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement } from 'lit/decorators.js';

import { classMap } from 'lit/directives/class-map.js';
import {
	DOUBLE_TAP_WINDOW,
	HOLD_TIME,
	REPEAT_DELAY,
} from '../models/constants';
import { ButtonThumbType, ButtonThumbTypes } from '../models/interfaces';
import { buildStyles } from '../utils/styles';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-button')
export class CustomFeatureButton extends BaseCustomFeature {
	clickTimer?: ReturnType<typeof setTimeout>;
	clickCount: number = 0;

	holdTimer?: ReturnType<typeof setTimeout>;
	holdInterval?: ReturnType<typeof setInterval>;
	hold: boolean = false;

	thumbType: ButtonThumbType = 'default';

	async onClick(e: PointerEvent) {
		e.stopImmediatePropagation();
		this.clickCount++;

		if (
			this.config.double_tap_action &&
			this.renderTemplate(
				this.config.double_tap_action?.action as string,
			) != 'none'
		) {
			// Double tap action is defined
			if (this.clickCount > 1) {
				// Double tap action is triggered
				this.fireHapticEvent('success');
				await this.sendAction('double_tap_action');
				this.endAction();
			} else {
				// Single tap action is triggered if double tap is not within 200ms
				const doubleTapWindow: number = this.config.double_tap_action
					.double_tap_window
					? (this.renderTemplate(
							this.config.double_tap_action
								.double_tap_window as unknown as string,
						) as number)
					: DOUBLE_TAP_WINDOW;
				if (!this.clickTimer) {
					this.clickTimer = setTimeout(async () => {
						this.fireHapticEvent('light');
						await this.sendAction('tap_action');
						this.endAction();
					}, doubleTapWindow);
				}
			}
		} else {
			// No double tap action defined, tap action is triggered
			this.fireHapticEvent('light');
			await this.sendAction('tap_action');
			this.endAction();
		}
	}

	async onPointerDown(e: PointerEvent) {
		super.onPointerDown(e);
		if (!this.swiping) {
			if (
				this.config.momentary_start_action &&
				this.renderTemplate(
					this.config.momentary_start_action?.action ?? 'none',
				) != 'none'
			) {
				this.fireHapticEvent('light');
				this.momentaryStart = performance.now();
				await this.sendAction('momentary_start_action');
			} else if (
				this.config.momentary_end_action &&
				this.renderTemplate(
					this.config.momentary_end_action?.action ?? 'none',
				) != 'none'
			) {
				this.fireHapticEvent('light');
				this.momentaryStart = performance.now();
			} else if (!this.holdTimer && this.config.hold_action) {
				const holdTime = this.config.hold_action.hold_time
					? (this.renderTemplate(
							this.config.hold_action
								?.hold_time as unknown as string,
						) as number)
					: HOLD_TIME;
				const holdAction = this.renderTemplate(
					this.config.hold_action?.action as string,
				);

				if (holdAction != 'none') {
					this.holdTimer = setTimeout(() => {
						if (!this.swiping) {
							this.hold = true;
							if (holdAction == 'repeat') {
								const repeatDelay = this.config.hold_action
									?.repeat_delay
									? (this.renderTemplate(
											this.config.hold_action
												?.repeat_delay as unknown as string,
										) as number)
									: REPEAT_DELAY;
								if (!this.holdInterval) {
									this.holdInterval = setInterval(
										async () => {
											this.fireHapticEvent('selection');
											await this.sendAction('tap_action');
										},
										repeatDelay,
									);
								}
							} else {
								this.fireHapticEvent('selection');
							}
						}
					}, holdTime);
				}
			}
		}
	}

	async onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		if (!this.swiping && this.initialX && this.initialY) {
			if (
				this.config.momentary_end_action &&
				this.renderTemplate(
					this.config.momentary_end_action?.action as string,
				) != 'none'
			) {
				this.fireHapticEvent('selection');
				this.momentaryEnd = performance.now();
				await this.sendAction('momentary_end_action');
				this.endAction();
			} else if (
				this.config.momentary_start_action &&
				this.renderTemplate(
					this.config.momentary_start_action?.action as string,
				) != 'none'
			) {
				this.endAction();
			} else if (this.hold) {
				// Hold action is triggered
				e.stopImmediatePropagation();
				e.preventDefault();
				if (
					!(
						this.renderTemplate(
							this.config.hold_action?.action as string,
						) == 'repeat'
					)
				) {
					this.fireHapticEvent('medium');
					await this.sendAction('hold_action');
				}
				this.endAction();
			} else {
				// Hold action is not triggered, fire tap action
				this.onClick(e);
			}
		}
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
			this.onPointerCancel(e);
		}
	}

	async onPointerCancel(e: PointerEvent) {
		if (
			this.renderTemplate(
				this.config.momentary_start_action?.action ?? 'none',
			) != 'none' &&
			this.renderTemplate(
				this.config.momentary_end_action?.action ?? 'none',
			) != 'none'
		) {
			this.momentaryEnd = performance.now();
			await this.sendAction('momentary_end_action');
		}

		super.onPointerCancel(e);
	}

	endAction() {
		clearTimeout(this.clickTimer as ReturnType<typeof setTimeout>);
		this.clickTimer = undefined;
		this.clickCount = 0;

		clearTimeout(this.holdTimer as ReturnType<typeof setTimeout>);
		clearInterval(this.holdInterval as ReturnType<typeof setInterval>);
		this.holdTimer = undefined;
		this.holdInterval = undefined;
		this.hold = false;

		super.endAction();
	}

	render() {
		return html`<button
				class=${classMap({
					[this.className]: true,
					background: true,
					[this.thumbType]: true,
					md3: this.thumbType.startsWith('md3'),
				})}
				part="button"
				tabindex="-1"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				${this.buildRipple()}
			</button>
			${this.buildIcon(this.icon)}
			${this.buildLabel(this.label)}${buildStyles(this.styles)}`;
	}

	shouldUpdate(changedProperties: PropertyValues) {
		const should = super.shouldUpdate(changedProperties);

		if (
			changedProperties.has('hass') ||
			changedProperties.has('stateObj') ||
			changedProperties.has('value')
		) {
			let thumbType = this.renderTemplate(
				this.config.thumb as string,
			) as ButtonThumbType;
			thumbType = ButtonThumbTypes.includes(thumbType)
				? thumbType
				: 'default';

			if (thumbType != this.thumbType) {
				this.thumbType = thumbType;
				return true;
			}
		}

		return should;
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					-webkit-tap-highlight-color: transparent;
					-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
					--md-ripple-hover-opacity: var(
						--ha-ripple-hover-opacity,
						0.08
					);
					--md-ripple-pressed-opacity: var(
						--ha-ripple-pressed-opacity,
						0.12
					);
					--ha-ripple-color: var(--secondary-text-color);
					--md-ripple-hover-color: var(
						--ha-ripple-hover-color,
						var(--ha-ripple-color, var(--secondary-text-color))
					);
					--md-ripple-pressed-color: var(
						--ha-ripple-pressed-color,
						var(--ha-ripple-color, var(--secondary-text-color))
					);
				}

				button {
					background: 0px 0px !important;
					opacity: 1 !important;
					position: absolute;
					cursor: pointer;
					height: 100%;
					width: 100%;
					border: none;
					overflow: hidden;
					transition: box-shadow 180ms ease-in-out;
				}
				button::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					height: 100%;
					width: 100%;
					background: var(--color, var(--disabled-color));
					opacity: var(--opacity, 0.2);
				}
				button:focus-visible {
					outline: none;
				}

				@media (hover: hover) {
					.option:hover {
						opacity: var(--hover-opacity) !important;
						background: var(
							--color,
							var(--state-inactive-color, var(--disabled-color))
						) !important;
					}
				}
				.option:active {
					opacity: var(--hover-opacity) !important;
					background: var(
						--color,
						var(--state-inactive-color, var(--disabled-color))
					) !important;
				}
			`,
		];
	}
}
