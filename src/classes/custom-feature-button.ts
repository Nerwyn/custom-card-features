import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';

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
	@state() hold: boolean = false;

	thumbType: ButtonThumbType = 'default';
	toggleStyles: boolean = false;

	async onClick(e: PointerEvent) {
		e.stopImmediatePropagation();
		this.clickCount++;

		if (
			this.config.double_tap_action &&
			this.renderTemplate(this.config.double_tap_action?.action as string) !=
				'none'
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
				this.renderTemplate(
					this.config.momentary_start_action?.action ?? 'none',
				) != 'none' ||
				this.renderTemplate(
					this.config.momentary_repeat_action?.action ?? 'none',
				) != 'none'
			) {
				this.fireHapticEvent('light');
				this.momentaryStart = performance.now();
				await this.sendAction('momentary_start_action');

				const holdTime = this.renderTemplate(
					this.config.momentary_repeat_action?.hold_time ?? HOLD_TIME,
				) as number;

				clearTimeout(this.holdTimer);
				clearInterval(this.holdInterval);
				if (
					this.renderTemplate(
						this.config.momentary_repeat_action?.action ?? 'none',
					) != 'none'
				) {
					this.holdTimer = setTimeout(async () => {
						if (!this.swiping) {
							this.hold = true;
							const repeat_delay = this.renderTemplate(
								this.config.momentary_repeat_action?.repeat_delay ??
									REPEAT_DELAY,
							) as number;
							this.holdInterval = setInterval(async () => {
								this.fireHapticEvent('selection');
								this.momentaryEnd = performance.now();
								await this.sendAction('momentary_repeat_action');
							}, repeat_delay);
						}
					}, holdTime);
				}
			} else if (
				this.renderTemplate(
					this.config.momentary_end_action?.action ?? 'none',
				) != 'none'
			) {
				this.fireHapticEvent('light');
				this.momentaryStart = performance.now();
			} else if (!this.holdTimer && this.config.hold_action) {
				const holdTime = this.config.hold_action.hold_time
					? (this.renderTemplate(
							this.config.hold_action?.hold_time as unknown as string,
						) as number)
					: HOLD_TIME;
				const holdAction = this.renderTemplate(
					this.config.hold_action?.action as string,
				);

				clearTimeout(this.holdTimer);
				clearInterval(this.holdInterval);
				this.holdTimer = setTimeout(() => {
					if (!this.swiping) {
						this.hold = true;
						if (holdAction != 'none') {
							if (holdAction == 'repeat') {
								const repeatDelay = this.config.hold_action?.repeat_delay
									? (this.renderTemplate(
											this.config.hold_action
												?.repeat_delay as unknown as string,
										) as number)
									: REPEAT_DELAY;
								this.holdInterval = setInterval(async () => {
									this.fireHapticEvent('selection');
									await this.sendAction('tap_action');
								}, repeatDelay);
							} else {
								this.fireHapticEvent('selection');
							}
						}
					}
				}, holdTime);
			}
		}
	}

	async onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		if (!this.swiping && this.initialX && this.initialY) {
			if (
				this.renderTemplate(
					this.config.momentary_end_action?.action ?? 'none',
				) != 'none'
			) {
				this.fireHapticEvent('light');
				this.momentaryEnd = performance.now();
				await this.sendAction('momentary_end_action');
				this.endAction();
			} else if (
				this.renderTemplate(
					this.config.momentary_start_action?.action ?? 'none',
				) != 'none' ||
				this.renderTemplate(
					this.config.momentary_repeat_action?.action ?? 'none',
				) != 'none'
			) {
				this.endAction();
			} else if (this.hold) {
				// Hold action is triggered
				e.stopImmediatePropagation();
				e.preventDefault();
				if (
					this.renderTemplate(this.config.hold_action?.action ?? 'none') !=
					'repeat'
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
		this.hold = false;
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);

		// Only consider significant enough movement
		const sensitivity = 8;
		const totalDeltaX = (this.currentX ?? 0) - (this.initialX ?? 0);
		const totalDeltaY = (this.currentY ?? 0) - (this.initialY ?? 0);
		if (Math.abs(Math.abs(totalDeltaX) - Math.abs(totalDeltaY)) > sensitivity) {
			this.onPointerCancel(e);
		}
	}

	async onPointerCancel(e: PointerEvent) {
		if (
			this.renderTemplate(
				this.config.momentary_start_action?.action ?? 'none',
			) != 'none' &&
			this.renderTemplate(this.config.momentary_end_action?.action ?? 'none') !=
				'none'
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
				class="background"
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
			${this.buildLabel(this.label)}${buildStyles(this.styles)}
			<div class="hold-indicator"></div>`;
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
			thumbType = ButtonThumbTypes.includes(thumbType) ? thumbType : 'default';

			const toggleStyles =
				String(this.renderTemplate(this.config.toggle_styles ?? 'false')) ==
				'true';

			if (thumbType != this.thumbType || toggleStyles != this.toggleStyles) {
				this.thumbType = thumbType;
				this.classList.add(thumbType);
				if (thumbType.startsWith('md3')) {
					this.classList.add('md3');
				} else {
					this.classList.remove(
						...Array.from(this.classList.values()).filter((c) =>
							c.startsWith('md3'),
						),
					);
				}

				this.toggleStyles = toggleStyles;
				if (toggleStyles) {
					this.classList.add('toggle');
				} else {
					this.classList.remove('toggle');
				}

				return true;
			}
		}

		return should || changedProperties.has('hold');
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);

		if (this.hold) {
			this.setAttribute('hold', '');
			const holdIndicator = this.shadowRoot?.querySelector(
				'.hold-indicator',
			) as HTMLElement;
			if (holdIndicator) {
				holdIndicator.style.setProperty('left', `${this.initialX ?? 0}px`);
				holdIndicator.style.setProperty('top', `${this.initialY ?? 0}px`);
			}
		} else {
			this.removeAttribute('hold');
		}
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					-webkit-tap-highlight-color: transparent;
					-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
					--md-ripple-hover-opacity: var(--ha-ripple-hover-opacity, 0.08);
					--md-ripple-pressed-opacity: var(--ha-ripple-pressed-opacity, 0.12);
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

				button.background {
					background: 0px 0px;
					opacity: 1;
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

				.hold-indicator {
					position: fixed;
					height: 50px;
					width: 50px;
					background: var(--primary-color);
					transform: translate(-50%, -50%) scale(0);
					pointer-events: none;
					z-index: 999;
					opacity: 0.2;
					border-radius: 50%;
					transition: transform 180ms ease-in-out;
				}
				:host([hold]) .hold-indicator {
					transform: translate(-50%, -50%) scale(1);
				}

				/* Transparent */
				:host(.transparent) {
					border-radius: 0;
				}
				:host(.transparent) button::before,
				:host(.transparent) md-ripple {
					visibility: hidden;
				}

				/* Material Design 3 */
				:host(.md3) {
					border-radius: 0;
					flex-direction: row;
					justify-content: center;
					gap: 8px;
					padding: 0 16px;
					overflow: visible;

					--md-button-border-radius: var(--feature-height, 40px);
					--ha-card-box-shadow:
						#000 0px 2px 1px -1px, #000 0px 1px 1px 0px, #000 0px 1px 3px 0px;
					--md-ripple-hover-color: var(--md-button-on-background-color);
					--md-ripple-pressed-color: var(--md-button-on-background-color);
					--md-ripple-hover-opacity: var(--ha-ripple-hover-opacity, 0.08);
					--md-ripple-pressed-opacity: var(--ha-ripple-pressed-opacity, 0.1);
				}
				:host(.md3) button {
					inset-inline-start: 0;
					border-radius: var(--md-button-border-radius);
					transition:
						border-radius var(--md-sys-motion-expressive-spatial-fast),
						border-start-start-radius
							var(--md-sys-motion-expressive-spatial-fast),
						border-start-end-radius var(--md-sys-motion-expressive-spatial-fast),
						border-end-start-radius var(--md-sys-motion-expressive-spatial-fast),
						border-end-end-radius var(--md-sys-motion-expressive-spatial-fast),
						outline var(--md-sys-motion-expressive-spatial-fast);
				}
				:host(.md3) button::before {
					opacity: var(--opacity, 1);
					background: var(
						--color,
						var(--md-button-background-color, var(--disabled-color))
					);
					transition: background var(--md-sys-motion-expressive-effects-fast);
				}
				:host(.md3) .icon {
					color: var(
						--icon-color,
						var(--md-button-on-background-color, inherit)
					);
					transition: color var(--md-sys-motion-expressive-effects-fast);
				}
				:host(.md3) .label {
					color: var(
						--label-color,
						var(--md-button-on-background-color, inherit)
					);
					width: fit-content;
					font-family: var(--font-family);
					font-size: var(--md-sys-typescale-label-large-size, 14px);
					font-weight: var(--md-sys-typescale-label-large-weight, 500);
					line-height: var(--md-sys-typescale-label-large-line-height, 20px);
					letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
					transition: color var(--md-sys-motion-expressive-effects-fast);
				}
				:host(.md3.toggle[value='on']) {
					--md-button-border-radius: var(--md-sys-shape-corner-medium, 12px);
				}

				:host(.md3-elevated) {
					--md-button-background-color: var(
						--md-sys-color-surface-container-low,
						var(--ha-card-background, var(--card-background-color))
					);
					--md-button-on-background-color: var(
						--md-sys-color-primary,
						var(--primary-color)
					);
				}
				:host(.md3-elevated) button {
					box-shadow: var(--md-sys-elevation-level1, var(--ha-card-box-shadow));
				}
				:host(.md3-elevated.option.selected),
				:host(.md3-elevated.toggle[value='on']) {
					--md-button-background-color: var(
						--md-sys-color-primary,
						var(--primary-color)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-primary,
						var(--text-primary-color)
					);
				}

				:host(.md3-filled) {
					--md-button-background-color: var(
						--md-sys-color-primary,
						var(--primary-color)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-primary,
						var(--text-primary-color)
					);
				}
				:host(.md3-filled.option:not(.selected)),
				:host(.md3-filled.toggle[value='off']) {
					--md-button-background-color: var(
						--md-sys-color-surface-container,
						var(--primary-background-color)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-surface-variant,
						var(--secondary-text-color)
					);
				}

				:host(.md3-tonal) {
					--md-button-background-color: var(
						--md-sys-color-secondary-container,
						var(--secondary-background-color)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-secondary-container,
						var(--text-primary-color)
					);
				}
				:host(.md3-tonal.option.selected),
				:host(.md3-tonal.toggle[value='on']) {
					--md-button-background-color: var(
						--md-sys-color-secondary,
						var(--accent-color)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-secondary,
						var(--text-accent-color)
					);
				}

				:host(.md3-outlined) {
					--md-button-background-color: transparent;
					--md-button-on-background-color: var(
						--md-sys-color-on-surface-variant,
						var(--secondary-text-color)
					);
				}
				:host(.md3-outlined) button {
					border-color: var(
						--md-sys-color-outline-variant,
						var(--divider-color)
					);
					border-width: 1px;
					border-style: solid;
				}
				:host(.md3-outlined.option.selected),
				:host(.md3-outlined.toggle[value='on']) {
					--md-button-background-color: var(
						--md-sys-color-inverse-surface,
						rgb(
							from var(--lovelace-background, var(--primary-background-color))
								calc(255 - r) calc(255 - g) calc(255 - b)
						)
					);
					--md-button-on-background-color: var(
						--md-sys-color-inverse-on-surface,
						rgb(
							from var(--primary-text-color,) calc(255 - r) calc(255 - g)
								calc(255 - b)
						)
					);
				}

				:host(.md3-text) {
					--md-button-background-color: transparent;
					--md-button-on-background-color: var(
						--md-sys-color-primary,
						var(--primary-color)
					);
				}

				:host([pressed].md3) {
					--md-button-border-radius: var(--md-sys-shape-corner-small, 8px);
				}
				:host([pressed].md3.toggle) {
					--md-button-border-radius: var(
						--md-sys-shape-corner-extra-small,
						4px
					);
				}
				:host(.md3:focus-visible) {
					box-shadow: none;
					z-index: 1;
				}
				:host(.md3:focus-visible) button {
					outline: 3px solid var(--md-sys-color-secondary, var(--accent-color));
					outline-offset: 2px;
				}
			`,
		];
	}
}
