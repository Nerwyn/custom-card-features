import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { RANGE_MAX, RANGE_MIN, STEP, STEP_COUNT } from '../models/constants';
import { SliderThumbType, SliderThumbTypes } from '../models/interfaces';
import { getNumericPixels } from '../utils/styles';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-slider')
export class CustomFeatureSlider extends BaseCustomFeature {
	@state() thumbOffset: number = 0;
	@state() sliderOn: boolean = true;

	range: [number, number] = [RANGE_MIN, RANGE_MAX];
	step: number = STEP;

	thumbType: SliderThumbType = 'default';
	thumbWidth: number = 0;
	resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			this.featureWidth = entry.contentRect.width;
			this.setThumbOffset();
		}
	});

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

	onPointerDown(e: PointerEvent) {
		super.onPointerDown(e);
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this._value = slider.value;
			this.setThumbOffset();
			this.sliderOn = true;
		}
	}

	async onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		this.setThumbOffset();
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping && this.initialX && this.initialY) {
			this._value = slider.value;
			this.fireHapticEvent('light');
			await this.sendAction('tap_action');
		} else {
			this.getValueFromHass = true;
			this.setValue();
			this.setThumbOffset();
			this.setSliderState();
		}

		this.endAction();
		this.resetGetValueFromHass();
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);
		const slider = e.currentTarget as HTMLInputElement;

		// Only consider significant enough movement
		const sensitivity = 40;
		if (
			Math.abs((this.currentX ?? 0) - (this.initialX ?? 0)) <
			Math.abs((this.currentY ?? 0) - (this.initialY ?? 0)) - sensitivity
		) {
			this.swiping = true;
			this.getValueFromHass = true;
			this.setValue();
			this.setThumbOffset();
			this.setSliderState();
		} else {
			this._value = slider.value;
		}
	}

	setValue() {
		super.setValue();
		if (this.getValueFromHass) {
			this._value = this.value;
		}
	}

	setThumbOffset() {
		const maxOffset = (this.featureWidth - this.thumbWidth) / 2;
		this.thumbOffset = Math.min(
			Math.max(
				Math.round(
					((this.featureWidth - this.thumbWidth) /
						(this.range[1] - this.range[0])) *
						(((this.value as number) ?? this.range[0]) -
							(this.range[0] + this.range[1]) / 2),
				),
				-1 * maxOffset,
			),
			maxOffset,
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

	setSliderStyles() {
		this.style.setProperty(
			'--tooltip-label',
			`'${this.renderTemplate('{{ value }}{{ unit }}')}'`,
		);

		this.style.setProperty(
			'--thumb-offset',
			`calc(${this.rtl ? '-1 * ' : ''}${this.thumbOffset}px)`,
		);
	}

	buildTooltip() {
		return html`<div class="tooltip" part="tooltip"></div>`;
	}

	buildThumb(thumbType: SliderThumbType) {
		return html`<div class="thumb ${thumbType}" part="thumb">
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
		this.setSliderStyles();

		return html`
			<div
				class="container ${classMap({
					off: !this.sliderOn,
					'read-only':
						this.renderTemplate(
							this.config.tap_action?.action as string,
						) == 'none',
				})}"
				part="container"
			>
				${this.buildBackground()}${this.buildSlider()}${this.buildThumb(
					thumbType,
				)}
				<div class="icon-label">
					${this.buildIcon(this.config.icon)}
					${this.buildLabel(this.config.label)}
				</div>
			</div>
			${this.buildTooltip()}${this.buildStyles(this.config.styles)}
		`;
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);

		// Ensure that both the input range and div thumbs are the same size
		const thumb = this.shadowRoot?.querySelector('.thumb') as HTMLElement;
		const style = getComputedStyle(thumb);
		const userThumbWidth = style.getPropertyValue('--thumb-width');

		if (userThumbWidth) {
			const pixels = getNumericPixels(userThumbWidth);
			if (!isNaN(pixels)) {
				this.thumbWidth = pixels;
			}
		} else {
			switch (this.thumbType) {
				case 'round': {
					const pixels = getNumericPixels(
						style.getPropertyValue('height'),
					);
					if (!isNaN(pixels)) {
						this.thumbWidth = pixels;
					}
					break;
				}
				case 'line':
				case 'flat':
				default:
					const pixels = getNumericPixels(
						style.getPropertyValue('width'),
					);
					if (!isNaN(pixels)) {
						this.thumbWidth = pixels;
					}
					break;
			}
			this.style.setProperty('--thumb-width', `${this.thumbWidth}px`);
		}
	}

	async onKeyDown(e: KeyboardEvent) {
		const keys = ['ArrowLeft', 'ArrowRight'];
		if (keys.includes(e.key)) {
			e.preventDefault();
			this.getValueFromHass = false;
			this._value =
				parseFloat((this.value ?? this.range[0]) as unknown as string) +
				((e.key == 'ArrowLeft') != this.rtl ? -1 : 1) * this.step;
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

	connectedCallback(): void {
		super.connectedCallback();
		this.resizeObserver.observe(
			this.shadowRoot?.querySelector('.container') ?? this,
		);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.resizeObserver.disconnect();
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
					height: var(--feature-height, 40px);
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
					right: calc(var(--thumb-width) / 2);
					background: inherit;
				}

				.thumb.default {
					border-radius: var(--thumb-border-radius, 8px);
					background: var(--color, var(--feature-color));
				}
				.thumb.default::after {
					content: '';
					position: absolute;
					height: 22px;
					width: 4px;
					top: 25%;
					right: 6px;
					border-radius: 4px;
					background: #ffffff;
				}

				.thumb.flat {
					background: var(--color, var(--feature-color));
				}

				.thumb.line {
					border-radius: 8px;
					background: #ffffff;
				}
				.thumb.line::after {
					content: '';
					position: absolute;
					height: 22px;
					width: 4px;
					border-radius: 4px;
					top: 25%;
					right: 4px;
					background: #8a8c99;
				}
				.thumb.line .active {
					display: none;
				}

				.thumb.round {
					height: var(--feature-height, 40px);
					width: var(--feature-height, 40px);
					border-radius: var(--feature-height, 40px);
					background: var(--color, var(--feature-color));
					opacity: var(--opacity, 1);
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
					--thumb-transition: background 180ms ease-in-out;
				}
				:host([pressed]) .tooltip {
					transition: opacity 540ms ease-in-out 0s;
					opacity: 1;
				}

				.read-only input {
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
