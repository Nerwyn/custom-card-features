import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { RANGE_MAX, RANGE_MIN, STEP, STEP_COUNT } from '../models/constants';
import { SliderThumbType, SliderThumbTypes } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-slider')
export class CustomFeatureSlider extends BaseCustomFeature {
	@state() thumbOffset: number = 0;
	@state() sliderOn: boolean = true;

	range: [number, number] = [RANGE_MIN, RANGE_MAX];
	step: number = STEP;

	thumbType: SliderThumbType = 'default';

	pressedTimeout?: ReturnType<typeof setTimeout>;

	set _value(value: string | number | boolean | undefined) {
		value = Math.max(
			Math.min(Number(value) ?? this.range[0], this.range[1]),
			this.range[0],
		);
		if (!this.precision) {
			value = Math.trunc(value as number);
		}
		this.value = value;
	}

	onInput(e: InputEvent) {
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this._value = slider.value;
			this.sliderOn = true;
		}
	}

	onPointerDown(e: PointerEvent) {
		super.onPointerDown(e);

		// Delay pressed state to fix initial slider thumb transition
		this.pressed = false;
		this.pressedTimeout = setTimeout(() => (this.pressed = true), 150);

		if (!this.swiping) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this.sliderOn = true;
		}
	}

	async onPointerUp(e: PointerEvent) {
		clearTimeout(this.pressedTimeout);
		super.onPointerUp(e);
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping && this.initialX && this.initialY) {
			this._value = slider.value;
			this.fireHapticEvent('light');
			await this.sendAction('tap_action');
		} else {
			this.getValueFromHass = true;
			this.setValue();
			this.setSliderState();
		}

		this.endAction();
		this.resetGetValueFromHass();
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);

		if (this.currentX && this.currentY && e.isPrimary) {
			const slider = e.currentTarget as HTMLInputElement;

			// Only consider significant enough movement
			const sensitivity = 40;
			if (
				Math.abs((this.currentX ?? 0) - (this.initialX ?? 0)) <
				Math.abs((this.currentY ?? 0) - (this.initialY ?? 0)) -
					sensitivity
			) {
				this.swiping = true;
				this.getValueFromHass = true;
				this.setValue();
				this.setSliderState();
			} else {
				this._value = slider.value;
			}
		}
	}

	setValue() {
		super.setValue();
		if (this.getValueFromHass) {
			this._value = this.value;
		}
	}

	setThumbOffset() {
		const thumbWidth =
			this.shadowRoot?.querySelector('.thumb')?.clientWidth ?? 12;
		const maxOffset = (this.clientWidth - thumbWidth) / 2;
		this.thumbOffset = Math.min(
			Math.max(
				Math.round(
					((this.clientWidth - thumbWidth) /
						(this.range[1] - this.range[0])) *
						(((this.value as number) ?? this.range[0]) -
							(this.range[0] + this.range[1]) / 2),
				),
				-1 * maxOffset,
			),
			maxOffset,
		);

		this.style.setProperty(
			'--thumb-offset',
			`${(this.rtl ? -1 : 1) * this.thumbOffset}px`,
		);
	}

	setSliderState() {
		this.sliderOn =
			!(
				this.value == undefined ||
				['off', 'idle', null, undefined].includes(
					this.hass.states[this.entityId as string]?.state,
				)
			) || ((this.value as number) ?? this.range[0]) > this.range[0];
	}

	buildTicks() {
		if (
			String(this.renderTemplate(this.config.ticks ?? 'false')) == 'true'
		) {
			const values = [];
			for (let i = this.range[0]; i <= this.range[1]; i += this.step) {
				values.push(i);
			}
			return html`<div class="ticks">
				${values.map(
					(i) =>
						html`<div
							class="tick ${i > parseFloat(this.value as string)
								? 'in'
								: ''}active"
							value="${i}"
						></div>`,
				)}
			</div>`;
		}
		return '';
	}

	buildMD3Thumb() {
		return this.thumbType == 'md3-slider'
			? html`<div class="md3-thumb" part="md3-thumb">
					<div class="md3-thumb-active-track-corner"></div>
					<div class="md3-thumb-line"></div>
					<div class="md3-thumb-inactive-track-corner"></div>
				</div>`
			: '';
	}

	buildTooltip() {
		return html`<div class="tooltip" part="tooltip"></div>`;
	}

	buildThumb() {
		return html`<div class="thumb" part="thumb">
			<div class="active" part="active"></div>
		</div>`;
	}

	buildSlider() {
		return html`
			<input
				type="range"
				part="range"
				tabindex="-1"
				min="${this.range[0]}"
				max="${this.range[1]}"
				step=${this.step}
				value="${this.range[0]}"
				.value="${this.value}"
				@input=${this.onInput}
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			/>
		`;
	}

	render() {
		this.setValue();

		if (this.config.range) {
			this.range[0] = parseFloat(
				(this.renderTemplate(
					this.config.range[0] as unknown as string,
				) as string) ?? RANGE_MIN,
			);
			this.range[1] = parseFloat(
				(this.renderTemplate(
					this.config.range[1] as unknown as string,
				) as string) ?? RANGE_MAX,
			);
		}

		if (this.config.step) {
			this.step = parseFloat(
				this.renderTemplate(
					this.config.step as unknown as string,
				) as string,
			);
		} else {
			this.step = (this.range[1] - this.range[0]) / STEP_COUNT;
		}
		const splitStep = this.step.toString().split('.');
		if (splitStep.length > 1) {
			this.precision = splitStep[1].length;
		} else {
			this.precision = 0;
		}

		let thumbType = this.renderTemplate(
			this.config.thumb as string,
		) as SliderThumbType;
		this.thumbType = SliderThumbTypes.includes(thumbType)
			? thumbType
			: 'default';
		this.setSliderState();
		this.setThumbOffset();

		this.style.setProperty(
			'--tooltip-label',
			`'${this.renderTemplate('{{ value }}{{ unit }}')}'`,
		);

		return html`
			<div
				class="container ${classMap({
					off: !this.sliderOn,
					[this.thumbType]: true,
				})}"
				part="container"
			>
				${this.buildBackground()}${this.buildSlider()}
				${this.buildThumb()}${this.buildTicks()}
				<div class="icon-label">
					${this.buildIcon(this.config.icon)}
					${this.buildLabel(this.config.label)}
				</div>
			</div>
			${this.buildTooltip()}${this.buildMD3Thumb()}${this.buildStyles(
				this.config.styles,
			)}
		`;
	}

	firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);

		if (this.firefox && this.thumbType == 'md3-slider') {
			// Firefox md3 slider transition fix
			this.style.setProperty(
				'--thumb-transition',
				'var(--md-sys-motion-expressive-spatial-default)',
			);
		}
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);

		// Set readonly if action is none
		if (
			this.renderTemplate(this.config.tap_action?.action as string) ==
			'none'
		) {
			this.setAttribute('readonly', '');
		} else {
			this.removeAttribute('readonly');
		}

		// md3-slider icon and label colors
		if (this.thumbType == 'md3-slider') {
			const iconlabel = this.shadowRoot?.querySelector(
				'.icon-label',
			) as HTMLElement;
			if (iconlabel) {
				const width = iconlabel.clientWidth ?? 0;
				if (
					Math.floor(this.clientWidth / 2 + this.thumbOffset) < width
				) {
					iconlabel.className = 'icon-label inactive';
				} else {
					iconlabel.className = 'icon-label active';
				}
			}
		}
	}

	async onKeyDown(e: KeyboardEvent) {
		const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
		if (keys.includes(e.key)) {
			e.preventDefault();
			this.getValueFromHass = false;
			this._value =
				parseFloat((this.value ?? this.range[0]) as unknown as string) +
				((e.key == 'ArrowLeft') != this.rtl || e.key == 'ArrowDown'
					? -1
					: 1) *
					this.step;
		}
	}

	async onKeyUp(e: KeyboardEvent) {
		if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
			e.preventDefault();
			await this.sendAction('tap_action');
			this.endAction();
			this.resetGetValueFromHass();
		}
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					overflow: visible;

					--thumb-translate: var(--thumb-offset) 0;
					--thumb-transition: translate 180ms ease-in-out,
						background 180ms ease-in-out;
				}

				.background {
					background: var(
						--background,
						var(
							--color,
							var(--feature-color, var(--state-inactive-color))
						)
					);
				}

				.ticks {
					position: absolute;
					width: calc(100% - var(--thumb-width, 12px));
					height: 100%;
					pointer-events: none;
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					align-items: center;
				}
				.tick {
					height: 4px;
					width: 4px;
					border-radius: 50%;
				}
				.tick.inactive {
					background: var(--primary-color);
				}
				.tick.active {
					background: var(--primary-background-color);
				}

				input {
					position: absolute;
					appearance: none;
					-webkit-appearance: none;
					-moz-appearance: none;
					height: inherit;
					width: inherit;
					background: none;
					overflow: hidden;
					touch-action: pan-y;
					pointer-events: all;
					cursor: pointer;
				}
				input:focus-visible {
					outline: none;
				}

				::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--thumb-width, 12px);
					opacity: 0;
				}
				::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--thumb-width, 12px);
					opacity: 0;
				}

				.thumb {
					height: 100%;
					width: var(--thumb-width, 12px);
					opacity: var(--opacity, 1);
					position: absolute;
					pointer-events: none;
					translate: var(--thumb-translate);
					transition: var(--thumb-transition);
				}
				.thumb .active {
					height: 100%;
					width: 100vw;
					position: absolute;
					inset-inline-end: calc(var(--thumb-width, 12px) / 2);
					background: inherit;
				}
				:host([dir='rtl']) .thumb .active {
					inset-inline-end: unset;
					inset-inline-start: calc(var(--thumb-width, 12px) / 2);
				}

				/* Default Slider */
				.default .thumb {
					border-radius: var(--thumb-border-radius, 8px);
					background: var(--color, var(--feature-color));
				}
				.default .thumb::after {
					content: '';
					position: absolute;
					height: 22px;
					width: 4px;
					top: 25%;
					inset-inline-end: 6px;
					border-radius: 4px;
					background: #ffffff;
				}
				:host([dir='rtl']) .default .thumb::after {
					inset-inline-end: unset;
					inset-inline-start: 6px;
				}

				/* Flat Slider */
				.flat .thumb {
					background: var(--color, var(--feature-color));
				}

				/* Line Slider */
				.line .thumb {
					border-radius: 8px;
					background: #ffffff;
				}
				.line .thumb::after {
					content: '';
					position: absolute;
					height: 22px;
					width: 4px;
					border-radius: 4px;
					top: 25%;
					inset-inline-end: 4px;
					background: #c6c6d0;
				}
				.line .thumb .active {
					display: none;
				}

				/* Round Slider */
				.round .thumb {
					aspect-ratio: 1 / 1;
					border-radius: var(--feature-height, 40px);
					background: var(--color, var(--feature-color));
					opacity: var(--opacity, 1);
				}
				.round.container {
					border-radius: var(--feature-height, 40px);

					--thumb-width: var(--feature-height, 40px);
				}

				/* Material Design 3 Slider */
				:host:has(.md3-slider) {
					--thumb-transition: translate
							var(--md-sys-motion-expressive-spatial-default),
						background 180ms ease-in-out;
				}
				.md3-slider {
					max-height: 40px;
					border-radius: 12px;

					--mdc-icon-size: 24px;
					--on-active-track-color: var(
						--md-slider-with-tick-marks-active-container-color,
						var(--primary-background-color)
					);
					--on-inactive-track-color: var(
						--md-slider-with-tick-marks-inactive-container-color,
						var(--primary-color)
					);
				}
				.md3-slider .background {
					height: 100%;
					background: var(
						--background,
						var(
							--color,
							var(
								--md-slider-inactive-track-color,
								rgba(from var(--primary-color) r g b / 20%)
							)
						)
					);
					opacity: var(--background-opacity, 1);
				}
				.md3-slider .tick.active {
					background: var(--on-active-track-color);
				}
				.md3-slider .tick.inactive {
					background: var(--on-inactive-track-color);
				}
				.md3-thumb {
					background: var(
						--ha-card-background,
						var(--card-background-color, #fff)
					);
					display: flex;
					justify-content: center;
					align-items: center;
					height: 52px;
					width: 16px;
					position: absolute;
					translate: var(--thumb-translate);
					transition: var(--thumb-transition);
					pointer-events: none;
				}
				.md3-thumb-line {
					content: '';
					height: 100%;
					width: 4px;
					border-radius: 4px;
					background: var(
						--color,
						var(
							--md-slider-active-track-color,
							var(--primary-color)
						)
					);
					transition: scale
						var(--md-sys-motion-expressive-spatial-default);
				}
				:host(:focus-visible) .md3-thumb,
				:host([pressed]) .md3-thumb-line {
					scale: 0.5 1;
				}
				.md3-slider .thumb .active {
					height: 100%;
					background: var(
						--color,
						var(
							--md-slider-active-track-color,
							var(--primary-color)
						)
					);
					inset-inline-end: 0;
				}
				:host(:focus-visible):has(.md3-slider) {
					box-shadow: none;
				}
				.md3-thumb-active-track-corner,
				.md3-thumb-inactive-track-corner {
					position: relative;
					overflow: hidden;
					height: 40px;
					width: 4px;
				}
				.md3-thumb-active-track-corner {
					inset-inline-start: -6px;
					border-start-end-radius: 2px;
					border-end-end-radius: 2px;
				}
				.md3-thumb-active-track-corner,
				:host([dir='rtl']) .md3-thumb-inactive-track-corner {
					box-shadow: 2px 0 0
						var(
							--ha-card-background,
							var(--card-background-color, #fff)
						);
				}
				.md3-thumb-inactive-track-corner {
					inset-inline-end: -6px;
					border-start-start-radius: 2px;
					border-end-start-radius: 2px;
				}
				.md3-thumb-inactive-track-corner,
				:host([dir='rtl']) .md3-thumb-active-track-corner {
					box-shadow: -2px 0 0
						var(
							--ha-card-background,
							var(--card-background-color, #fff)
						);
				}
				.md3-slider .icon-label {
					flex-direction: row;
					justify-content: flex-start;
					gap: 8px;
					box-sizing: border-box;
					padding: 0 8px;
					transition: var(--thumb-transition);
					width: min-content;
					position: absolute;
					inset-inline-start: 0;
				}
				.md3-slider .label {
					width: min-content;
				}
				.md3-slider .icon-label.inactive {
					inset-inline-start: unset;
					translate: calc(50% + var(--thumb-offset)) 0;
				}
				:host([dir='rtl']) .icon-labe.inactive {
					translate: calc(-50% + var(--thumb-offset)) 0;
				}
				.md3-slider .icon-label.active .icon,
				.md3-slider .icon-label.active .label {
					color: var(--on-active-track-color);
				}
				.md3-slider .icon-label.inactive .icon,
				.md3-slider .icon-label.inactive .label {
					color: var(--on-inactive-track-color);
				}
				.md3-slider ~ .tooltip {
					background: var(--md-sys-color-inverse-surface, #2f3036);
					color: var(--md-sys-color-inverse-on-surface, #f1f0f7);
					padding: 12px 16px;
					border-radius: 24px;
					font-size: var(--md-sys-typescale-label-large-size, 14px);
					font-weight: var(
						--md-sys-typescale-label-large-weight,
						400
					);
					line-height: var(
						--md-sys-typescale-label-large-line-height,
						20px
					);
					letter-spacing: var(
						--md-sys-typescale-label-large-tracking,
						0.5px
					);
					transform: var(
						--tooltip-transform,
						translate(
							var(--thumb-offset),
							calc(-0.5 * var(--feature-height, 40px) - 32px)
						)
					);
				}

				.tooltip {
					display: var(--tooltip-display);
					background: var(--clear-background-color);
					color: var(--primary-text-color);
					position: absolute;
					border-radius: 0.8em;
					padding: 0.2em 0.4em;
					height: 20px;
					width: fit-content;
					pointer-events: none;
					line-height: 20px;
					transform: var(
						--tooltip-transform,
						translate(
							var(--thumb-offset),
							calc(
								-0.5 * var(--feature-height, 40px) - 0.4em - 10px
							)
						)
					);
					transition: opacity 180ms ease-in-out 0s;
					opacity: 0;
				}
				.tooltip::after {
					content: var(--tooltip-label, '0');
				}

				.icon-label {
					height: 100%;
					width: 100%;
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					pointer-events: none;
				}

				.off .background {
					background: var(
						--background,
						var(--color, var(--state-inactive-color))
					);
				}
				.off .thumb {
					visibility: hidden;
				}
				.off .label {
					display: none;
				}

				:host([pressed]) {
					--thumb-transition: background 180ms ease-in-out !important;
				}
				:host(:focus-visible) .tooltip,
				:host([pressed]) .tooltip {
					transition: opacity 540ms ease-in-out 0s;
					opacity: 1;
				}

				:host([readonly]) input {
					pointer-events: none;
					cursor: default;
				}

				:host([dir='rtl']) .thumb {
					scale: -1;
				}
			`,
		];
	}
}
