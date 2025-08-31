import { css, CSSResult, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
	CheckedValues,
	ToggleThumbType,
	UncheckedValues,
} from '../models/interfaces';
import { buildStyles } from '../utils/styles';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-toggle')
export class CustomFeatureToggle extends BaseCustomFeature {
	@state() thumbWidth: number = 0;
	@state() checked: boolean = false;
	direction?: 'left' | 'right';
	thumbType: ToggleThumbType = 'default';

	checkedIcon: string = '';
	uncheckedIcon: string = '';

	async onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		if (!this.swiping && this.initialX && this.initialY) {
			if (this.direction) {
				// Reject non-full width swipes if enabled
				if (
					String(
						this.renderTemplate(
							String(this.config.full_swipe ?? false),
						),
					) == 'true'
				) {
					const swipeSensitivity = this.clientWidth - this.thumbWidth;
					if (
						Math.abs((this.currentX ?? 0) - (this.initialX ?? 0)) <
						swipeSensitivity
					) {
						this.endAction();
						this.resetGetValueFromHass();
						return;
					}
				}

				// Only fire on swipe if it's in the right direction
				const checked = this.direction == (this.rtl ? 'left' : 'right');
				if (this.checked == checked) {
					this.endAction();
					this.resetGetValueFromHass();
					return;
				}
			} else if (
				String(
					this.renderTemplate(
						String(this.config.swipe_only ?? false),
					),
				) == 'true'
			) {
				this.endAction();
				this.resetGetValueFromHass();
				return;
			}
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this.checked = !this.checked;
			this.fireHapticEvent('light');
			await this.sendAction('tap_action');
		}
		this.endAction();
		this.resetGetValueFromHass();
	}

	onPointerMove(e: PointerEvent) {
		const deltaX0 = this.deltaX;
		super.onPointerMove(e);

		// Only consider significant enough movement
		const sensitivity = 40;
		const swipeSensitivity = 16;
		const horizontal = (this.currentX ?? 0) - (this.initialX ?? 0);
		if (
			Math.abs(horizontal) <
			Math.abs((this.currentY ?? 0) - (this.initialY ?? 0)) - sensitivity
		) {
			this.swiping = true;
			this.getValueFromHass = true;
			this.setValue();
		} else if (this.thumbType == 'default') {
			if (Math.abs(horizontal) > swipeSensitivity) {
				// Swipe detection
				this.direction = horizontal > 0 ? 'right' : 'left';
			}
			this.requestUpdate('deltaX', deltaX0);
		}
	}

	endAction() {
		this.direction = undefined;
		super.endAction();
	}

	renderTemplate(str: string, context?: object) {
		context = {
			...context,
			checked: this.checked,
		};
		return super.renderTemplate(str, context);
	}

	setValue() {
		super.setValue();
		if (this.getValueFromHass) {
			// Allow vs block list flag
			const allow =
				String(
					this.renderTemplate(String(this.config.allow_list ?? true)),
				) == 'true';

			let values: string[];
			if ((this.config.checked_values ?? []).length) {
				// User defined list of values
				values = (this.config.checked_values ?? []).map((value) =>
					(
						(this.renderTemplate(value) as string) ?? ''
					).toLowerCase(),
				);
			} else if (allow) {
				// Allow list
				values = CheckedValues;
			} else {
				// Block list
				values = UncheckedValues;
			}

			// Value > 0 check flag
			const checkNumeric =
				String(
					this.renderTemplate(
						String(this.config.check_numeric ?? true),
					),
				) == 'true';

			this.checked =
				allow == values.includes(String(this.value).toLowerCase()) ||
				(checkNumeric && Number(this.value) > 0);
		}
	}

	buildMD3Switch() {
		this.removeAttribute('tabindex');
		return html`
			<div class="icon-label">
				${this.buildIcon(this.icon)}${this.buildLabel(this.label)}
			</div>
			<div
				class="container md3-switch ${this.checked ? 'on' : 'off'}"
				part="md3-switch"
				tabindex="0"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				${this.buildBackground()}
				<div class="thumb" part="thumb">
					${this.buildIcon(
						this.checked ? this.checkedIcon : this.uncheckedIcon,
					)}
				</div>
			</div>
		`;
	}

	buildMD2Switch() {
		this.removeAttribute('tabindex');
		return html`
			<div class="icon-label">
				${this.buildIcon(this.icon)}${this.buildLabel(this.label)}
			</div>
			<div
				class="container md2-switch ${this.checked ? 'on' : 'off'}"
				part="md2-switch"
				tabindex="0"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				${this.buildBackground()}
				<div class="thumb" part="thumb">
					${this.buildIcon(
						this.checked ? this.checkedIcon : this.uncheckedIcon,
					)}${this.buildRipple()}
				</div>
			</div>
		`;
	}

	buildCheckbox() {
		this.removeAttribute('tabindex');
		return html`
			<div
				class="container ${this.checked ? 'on' : 'off'}"
				part="checkbox"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				<div class="checkbox" tabindex="0">
					${this.buildIcon(
						this.checked ? this.checkedIcon : this.uncheckedIcon,
					)}
				</div>
				${this.buildRipple()}
			</div>
			<div class="icon-label">
				${this.buildIcon(this.icon)}${this.buildLabel(this.label)}
			</div>
		`;
	}

	buildDefaultToggle() {
		const fullSwipe =
			String(
				this.renderTemplate(String(this.config.full_swipe ?? false)),
			) == 'true';
		let fullSwipeStyles = '';
		if (fullSwipe) {
			const maxTranslate = 100 * (this.clientWidth / this.thumbWidth - 1);
			if (!this.swiping && this.initialX && this.initialY) {
				fullSwipeStyles = `
					.thumb {
						translate: clamp(0%, ${(this.rtl ? -1 : 1) * ((this.currentX ?? 0) - (this.initialX ?? 0))}px, ${maxTranslate}%) !important;
						transition: none !important;
					}
					.on > .thumb {
						translate: clamp(0%, calc(${maxTranslate}% + ${(this.rtl ? -1 : 1) * ((this.currentX ?? 0) - (this.initialX ?? 0))}px), ${maxTranslate}%) !important;
					}
				`;
			} else {
				fullSwipeStyles = `
					.on > .thumb {
						translate: ${maxTranslate}% !important;
					}
				`;
			}
		}
		return html`
			<div
				class="container default ${fullSwipe ? 'full-swipe' : ''} ${this
					.checked
					? 'on'
					: 'off'}"
				part="default-switch"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				${this.buildBackground()}
				${this.buildIcon(this.checkedIcon) || html`<div></div>`}
				${this.buildIcon(this.uncheckedIcon) || html`<div></div>`}
				<div class="thumb" part="thumb">
					${this.buildIcon(this.icon)}${this.buildLabel(this.label)}
				</div>
			</div>
			<style>
				${fullSwipeStyles}
			</style>
		`;
	}

	render() {
		this.thumbType = this.renderTemplate(
			this.config.thumb ?? 'default',
		) as ToggleThumbType;
		let toggle: TemplateResult<1>;
		switch (this.thumbType) {
			case 'md3-switch':
				toggle = this.buildMD3Switch();
				break;
			case 'md2-switch':
				toggle = this.buildMD2Switch();
				break;
			case 'checkbox':
				toggle = this.buildCheckbox();
				break;
			case 'default':
			default:
				toggle = this.buildDefaultToggle();
				break;
		}

		return html`${toggle}${buildStyles(this.styles)}`;
	}

	firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);

		// Firefox md checkbox and switch flex and overflow fixes
		// Because :host:has() doesn't work with Firefox
		if (
			this.firefox &&
			this.renderTemplate(this.config.thumb ?? 'default') != 'default'
		) {
			// Keeps toggles visible on small width displays
			this.style.setProperty('justify-content', 'flex-end');

			// Allow ripples to overflow
			this.style.setProperty('overflow', 'visible');

			if (
				!this.shadowRoot?.querySelector('.icon-label')?.children.length
			) {
				// Makes checkboxes and toggles take up minimal space if they don't have an icon or label
				this.style.setProperty('flex', '0 0 min-content');
			}
		}
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);

		// Get thumb width
		const thumb = this.shadowRoot?.querySelector('.thumb');
		if (thumb) {
			this.thumbWidth = parseFloat(
				getComputedStyle(thumb)
					.getPropertyValue('width')
					.replace('px', ''),
			);
		}

		// md3-switch fix for themes that don't set different button and track colors
		if (
			this.renderTemplate(this.config.thumb ?? 'default') == 'md3-switch'
		) {
			const background = this.shadowRoot?.querySelector(
				'.background',
			) as HTMLElement;
			try {
				const style = getComputedStyle(background);

				const buttonChecked = style.getPropertyValue(
					'--switch-checked-button-color',
				);
				const trackChecked = style.getPropertyValue(
					'--switch-checked-track-color',
				);
				const trackUnchecked = style.getPropertyValue(
					'--switch-unchecked-track-color',
				);
				const buttonUnchecked = style.getPropertyValue(
					'--switch-unchecked-button-color',
				);
				if (
					trackChecked == buttonChecked ||
					trackUnchecked == buttonUnchecked
				) {
					if (this.checked) {
						background?.style.removeProperty('background');
						background?.style.setProperty('opacity', '54%');
					} else {
						background?.style.removeProperty('opacity');
						background?.style.setProperty(
							'background',
							'rgba(from var(--switch-unchecked-track-color) r g b / 38%)',
						);
					}
				} else {
					background?.style.removeProperty('background');
					background?.style.removeProperty('opacity');
				}
			} catch (e) {
				console.error(e);
				background?.style.removeProperty('background');
				background?.style.removeProperty('opacity');
			}
		}
	}

	shouldUpdate(changedProperties: PropertyValues) {
		const should = super.shouldUpdate(changedProperties);

		if (changedProperties.has('hass')) {
			const checkedIcon = this.renderTemplate(
				this.config.checked_icon as string,
			) as string;

			const uncheckedIcon = this.renderTemplate(
				this.config.unchecked_icon as string,
			) as string;

			if (
				checkedIcon != this.checkedIcon ||
				uncheckedIcon != this.uncheckedIcon
			) {
				this.checkedIcon = checkedIcon;
				this.uncheckedIcon = uncheckedIcon;
				return true;
			}
		}

		return (
			changedProperties.has('deltaX') ||
			/deltaX|initialX|currentX/.test(this.config.styles ?? '') ||
			should
		);
	}

	static get styles(): CSSResult | CSSResult[] {
		return [
			super.styles as CSSResult,
			css`
				/* Default toggle */
				:host {
					flex-direction: row;
					touch-action: pan-y;
				}
				.container {
					justify-content: space-around;
					border-radius: var(--feature-border-radius, 12px);
					--md-ripple-hover-opacity: var(
						--ha-ripple-hover-opacity,
						0.08
					);
					--md-ripple-pressed-opacity: var(
						--ha-ripple-pressed-opacity,
						0.12
					);
					--md-ripple-hover-color: var(
						--ha-ripple-hover-color,
						var(--ha-ripple-color)
					);
					--md-ripple-pressed-color: var(
						--ha-ripple-pressed-color,
						var(--ha-ripple-color)
					);
				}
				.background {
					cursor: pointer;
					background: var(
						--background,
						var(
							--color,
							var(--feature-color, var(--state-inactive-color))
						)
					);
				}
				.off > .background {
					background: var(
						--background,
						var(--color, var(--state-inactive-color))
					);
				}
				.thumb {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					position: absolute;
					left: 0;
					cursor: pointer;
					height: 100%;
					width: 50%;
					background: var(
						--color,
						var(--feature-color, var(--state-inactive-color))
					);
					opacity: var(--opacity, 1);
					border-radius: var(--feature-border-radius, 12px);
					transition:
						translate 180ms ease-in-out,
						background-color 180ms ease-in-out;
				}
				.off > .thumb {
					background: var(--color, var(--state-inactive-color));
				}
				.on > .thumb {
					translate: 100%;
				}
				:host([dir='rtl']) .default,
				:host([dir='rtl']) .default .icon,
				:host([dir='rtl']) .default .label {
					scale: -1 1;
				}

				/* Material Design Checkbox */
				:host(:has(.checkbox)) {
					border-radius: 0;
				}
				.container:has(.checkbox) {
					height: var(--mdc-checkbox-touch-target-size, 40px);
					width: var(--mdc-checkbox-touch-target-size, 40px);
					border-radius: var(--mdc-checkbox-touch-target-size, 40px);
					justify-content: center;
					flex-basis: auto;
					flex-shrink: 0;
					background: 0 0;
					--mdc-icon-size: 18px;
					--ha-ripple-pressed-opacity: 0.1;
					--ha-ripple-hover-color: var(
						--checkbox-unchecked-icon-color,
						var(--primary-text-color)
					);
					--ha-ripple-pressed-color: var(
						--checkbox-checked-border-color,
						var(--mdc-checkbox-checked-color, var(--primary-color))
					);
				}
				.container.on:has(.checkbox) {
					--ha-ripple-hover-color: var(
						--checkbox-checked-border-color,
						var(--mdc-checkbox-checked-color, var(--primary-color))
					);
					--ha-ripple-pressed-color: var(
						--checkbox-unchecked-icon-color,
						var(--primary-text-color)
					);
				}
				.container:has(.checkbox)::after {
					content: '';
					position: absolute;
					height: var(--mdc-checkbox-touch-target-size, 40px);
					width: var(--mdc-checkbox-touch-target-size, 40px);
					border-radius: var(--mdc-checkbox-touch-target-size, 40px);
					background: var(--ha-ripple-hover-color);
					opacity: 0;
					pointer-events: none;
				}
				.container:has(.checkbox:focus-visible)::after {
					outline: none;
					opacity: var(--ha-ripple-pressed-opacity);
				}
				.checkbox {
					height: 18px;
					width: 18px;
					border-radius: 2px;
					border: solid 2px;
					background: transparent;
					border-color: var(
						--checkbox-unchecked-border-color,
						var(
							--mdc-checkbox-unchecked-color,
							var(--secondary-text-color)
						)
					);
					cursor: pointer;
					transition:
						background 180ms ease-in-out,
						box-shadow 180ms ease-in-out;
					--icon-color: var(
						--checkbox-unchecked-icon-color,
						var(--primary-text-color)
					);
				}
				.on > .checkbox {
					background: var(
						--checkbox-checked-border-color,
						var(--mdc-checkbox-checked-color, var(--primary-color))
					);
					border-color: var(
						--checkbox-checked-border-color,
						var(--mdc-checkbox-checked-color, var(--primary-color))
					);
					--icon-color: var(
						--checkbox-checked-icon-color,
						var(--mdc-checkbox-ink-color, #fff)
					);
				}
				@media (hover: hover) {
					.off:hover > .checkbox {
						border-color: var(
							--checkbox-unchecked-icon-color,
							var(--primary-text-color)
						);
					}
				}
				.checkbox:focus-visible,
				.md2-switch:focus-visible,
				.md3-switch:focus-visible {
					outline: none;
				}

				:host:has(.icon-label:empty) {
					flex: 0 0 min-content;
				}
				.icon-label {
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 10px;
					height: 100%;
					width: 100%;
					min-width: 0;
				}
				.icon-label:empty {
					display: none;
				}
				.icon-label > .label {
					justify-content: flex-start;
					white-space: pre-line;
					height: 100%;
					overflow: hidden;
					text-overflow: clip;
				}

				/* Material Design 2 Switch */
				:host:has(.md2-switch),
				:host:has(.md3-switch) {
					justify-content: flex-end;
					overflow: visible;
					border-radius: 0;
				}
				.md2-switch {
					justify-content: flex-start;
					flex-basis: auto;
					flex-shrink: 0;
					height: 14px;
					width: 36px;
					overflow: visible;
					margin: 0 1px;
					cursor: pointer;
					--ha-ripple-color: #aaa;
				}
				.md2-switch > .background {
					border-radius: 32px;
					opacity: 0.38;
					background: var(--switch-unchecked-track-color);
					transition:
						opacity 90ms cubic-bezier(0.4, 0, 0.2, 1),
						background-color 90ms cubic-bezier(0.4, 0, 0.2, 1),
						border-color 90ms cubic-bezier(0.4, 0, 0.2, 1);
				}
				.md2-switch.on > .background {
					background: var(--switch-checked-track-color);
					border-color: var(--switch-checked-track-color);
					opacity: 0.54;
				}
				.md2-switch > .thumb {
					background: 0 0;
					height: 48px;
					width: 48px;
					border-radius: 48px;
					left: -15px;
					transition:
						translate 90ms cubic-bezier(0.4, 0, 0.2, 1),
						background-color 90ms cubic-bezier(0.4, 0, 0.2, 1),
						border-color 90ms cubic-bezier(0.4, 0, 0.2, 1);
				}
				.md2-switch > .thumb::before {
					content: '';
					box-shadow:
						rgba(0, 0, 0, 0.2) 0px 3px 1px -2px,
						rgba(0, 0, 0, 0.14) 0px 2px 2px 0px,
						rgba(0, 0, 0, 0.12) 0px 1px 5px 0px;
					box-sizing: border-box;
					position: absolute;
					height: 20px;
					width: 20px;
					border: 10px solid;
					border-radius: 28px;
					background: var(--switch-unchecked-button-color);
					border-color: var(--switch-unchecked-button-color);
				}
				.md2-switch.on > .thumb {
					translate: 18px;
				}
				.md2-switch.on > .thumb::before {
					background: var(--switch-checked-button-color);
					border-color: var(--switch-checked-button-color);
				}
				.md2-switch > .thumb::after {
					content: '';
					position: absolute;
					height: 48px;
					width: 48px;
					border-radius: 48px;
					background: var(--ha-ripple-color);
					opacity: 0;
				}
				.md2-switch:focus-visible > .thumb::after {
					opacity: var(--ha-ripple-pressed-opacity);
				}
				:host([dir='rtl']) .md2-switch,
				:host([dir='rtl']) .md2-switch .thumb > .icon {
					scale: -1 1;
				}

				/* Material Design 3 Switch */
				.md3-switch {
					justify-content: flex-start;
					flex-basis: auto;
					flex-shrink: 0;
					height: 28px;
					width: 48px;
					overflow: visible;
					margin-right: 4px;
					cursor: pointer;
				}
				.md3-switch > .background {
					border-radius: 52px;
					background: var(--switch-unchecked-track-color);
					border: 2px solid var(--switch-unchecked-button-color);
					opacity: 1;
					transition:
						opacity var(--md-sys-motion-expressive-effects-default),
						background-color
							var(--md-sys-motion-expressive-effects-fast),
						border-color
							var(--md-sys-motion-expressive-effects-fast);
				}
				.md3-switch.on > .background {
					background: var(--switch-checked-track-color);
					border-color: var(--switch-checked-track-color);
				}
				.md3-switch > .thumb {
					background: 0 0;
					height: 40px;
					width: 40px;
					border-radius: 40px;
					left: -4px;
					transition:
						translate var(--md-sys-motion-expressive-spatial-fast),
						background-color
							var(--md-sys-motion-expressive-effects-fast),
						border-color
							var(--md-sys-motion-expressive-effects-fast);
				}
				.md2-switch:has(.icon),
				.md3-switch:has(.icon) {
					--mdc-icon-size: 16px;
					--icon-color: var(
						--switch-unchecked-icon-color,
						var(--input-background-color)
					);
				}
				.md2-switch.on:has(.icon),
				.md3-switch.on:has(.icon) {
					--icon-color: var(
						--switch-checked-icon-color,
						var(--input-background-color)
					);
				}
				.md3-switch.on > .thumb {
					translate: 20px;
				}
				.md3-switch > .thumb::before {
					content: '';
					box-sizing: border-box;
					position: absolute;
					height: 16px;
					width: 16px;
					border-radius: 28px;
					background: var(--switch-unchecked-button-color);
					transition: scale
						var(--md-sys-motion-expressive-spatial-fast);
				}
				.md3-switch.off:has(.icon) > .thumb::before {
					scale: 1.5;
				}
				@media (hover: hover) {
					.md3-switch.off:hover > .thumb::before {
						scale: 1.75;
						background: var(
							--switch-unchecked-button-state-layer,
							var(--secondary-text-color)
						);
					}
				}
				.md3-switch.off:focus-visible > .thumb::before,
				.md3-switch.off:active > .thumb::before {
					scale: 1.75;
					background: var(
						--switch-unchecked-button-state-layer,
						var(--secondary-text-color)
					);
				}
				.md3-switch.on > .thumb::before {
					background: var(--switch-checked-button-color);
					scale: 1.5;
				}
				@media (hover: hover) {
					.md3-switch.on:hover > .thumb::before {
						scale: 1.75;
						background: var(
							--switch-checked-button-state-layer,
							var(--accent-color)
						);
					}
				}
				.md3-switch.on:focus-visible > .thumb::before,
				.md3-switch.on:active > .thumb::before {
					scale: 1.75;
					background: var(
						--switch-checked-button-state-layer,
						var(--accent-color)
					);
				}

				.md3-switch > .background::after {
					content: '';
					position: absolute;
					height: 32px;
					width: 52px;
					border-radius: 32px;
					pointer-events: none;
					top: -2px;
					left: -2px;
					z-index: 1;
					opacity: 0;
					background: var(
						--switch-unchecked-track-state-layer,
						var(--primary-text-color)
					);
					transition: opacity
						var(--md-sys-motion-expressive-effects-fast);
				}
				.md3-switch.on:hover > .background::after {
					background: var(--switch-checked-track-color);
				}
				@media (hover: hover) {
					.md3-switch:hover > .background::after {
						opacity: 0.08;
					}
				}
				.md3-switch:focus-visible > .background::after,
				.md3-switch:active > .background::after {
					opacity: 0.1;
				}
				:host([dir='rtl']) .md3-switch,
				:host([dir='rtl']) .md3-switch .thumb > .icon {
					flex-direction: row-reverse;
					scale: -1 1;
				}
			`,
		];
	}
}
