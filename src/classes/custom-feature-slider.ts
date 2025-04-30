import { css, CSSResult, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { RANGE_MAX, RANGE_MIN, STEP, STEP_COUNT } from '../models/constants';
import { SliderThumbType } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-slider')
export class CustomFeatureSlider extends BaseCustomFeature {
	@state() showTooltip: boolean = false;
	@state() thumbOffset: number = 0;
	@state() sliderOn: boolean = true;

	range: [number, number] = [RANGE_MIN, RANGE_MAX];
	step: number = STEP;

	thumbWidth: number = 0;
	sliderClass: string = 'slider ';
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
			this.showTooltip = true;
			this.sliderOn = true;
		}
	}

	async onPointerUp(e: PointerEvent) {
		this.setThumbOffset();
		this.showTooltip = false;
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
			this.showTooltip = false;
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
					this.hass.states[this.entityId as string].state,
				)
			) || ((this.value as number) ?? this.range[0]) > this.range[0];
	}

	buildTooltip() {
		return html`
			<div
				class="tooltip ${this.showTooltip ? 'faded-in' : 'faded-out'}"
			></div>
		`;
	}

	buildSlider() {
		return html`
			<input
				id="slider"
				type="range"
				class="${this.sliderClass}"
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
			<div
				class="thumb ${this.renderTemplate(
					this.config.thumb as SliderThumbType,
				)}"
			></div>
		`;
	}

	buildSliderStyles() {
		const styles = `
			:host {
				--tooltip-label: '${this.renderTemplate('{{ value }}{{ unit }}')}';
			}
			${
				this.rtl
					? `
			.slider::-webkit-slider-thumb {
				scale: -1;
			}
			.slider::-moz-range-thumb {
				scale: -1;
			}
			`
					: ''
			}
			${
				this.renderTemplate(this.config.tap_action?.action as string) ==
				'none'
					? `
			.slider {
				pointer-events: none;
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

		const sliderElement = this.shadowRoot?.querySelector('input');
		this.sliderClass = 'slider ';
		switch (this.renderTemplate(this.config.thumb as SliderThumbType)) {
			case 'line':
				this.sliderClass += 'line-thumb';
				this.thumbWidth = 10;
				break;
			case 'flat':
				this.sliderClass += 'flat-thumb';
				this.thumbWidth = 16;
				break;
			case 'round': {
				this.sliderClass += 'round-thumb';
				if (sliderElement) {
					const style = getComputedStyle(sliderElement);
					const height = style.getPropertyValue('height');
					if (height) {
						this.thumbWidth = parseInt(
							height.replace(/[^0-9]+/g, ''),
						);
					}
				}
				break;
			}
			default:
				this.sliderClass += 'default-thumb';
				this.thumbWidth = 12;
				break;
		}
		this.setSliderState();

		if (sliderElement) {
			const style = getComputedStyle(sliderElement);
			const thumbWidth = style.getPropertyValue('--thumb-width');
			if (thumbWidth) {
				this.thumbWidth = parseInt(thumbWidth.replace(/[^0-9]+/g, ''));
			}
		}

		this.rtl = getComputedStyle(this).direction == 'rtl';
		this.setThumbOffset();
		this.style.setProperty(
			'--thumb-offset',
			`calc(${this.rtl ? '-1 * ' : ''}${this.thumbOffset}px)`,
		);

		return html`
			<div class="container ${this.sliderOn ? 'on' : 'off'}">
				${this.buildBackground()}${this.buildSlider()}
				${this.buildIcon(this.config.icon)}
				${this.buildLabel(this.config.label)}
			</div>
			${this.buildTooltip()}${this.buildSliderStyles()}
			${this.buildStyles(this.config.styles)}
		`;
	}

	async onKeyDown(e: KeyboardEvent) {
		const keys = ['ArrowLeft', 'ArrowRight'];
		if (keys.includes(e.key)) {
			e.preventDefault();
			this.getValueFromHass = false;
			this.showTooltip = true;
			this._value =
				parseFloat((this.value ?? this.range[0]) as unknown as string) +
				((e.key == 'ArrowLeft') != this.rtl ? -1 : 1) * this.step;
		}
	}

	async onKeyUp(e: KeyboardEvent) {
		if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
			e.preventDefault();
			this.showTooltip = false;
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
					pointer-events: none;
					cursor: pointer;
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
				.off > .background {
					background: var(
						--background,
						var(--color, var(--state-inactive-color))
					);
				}
				.off > .label {
					display: none;
				}

				.slider {
					position: absolute;
					appearance: none;
					-webkit-appearance: none;
					-moz-appearance: none;
					height: inherit;
					background: none;
					pointer-events: all;
				}
				.slider:focus-visible {
					outline: none;
				}

				.slider,
				.default-thumb,
				.flat-thumb,
				.round-thumb {
					width: inherit;
					overflow: hidden;
					touch-action: pan-y;
				}

				.line-thumb {
					width: calc(100% - 5px);
				}

				::-webkit-slider-thumb,
				::-moz-range-thumb {
					appearance: none;
					-webkit-appearance: none;
					-moz-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--feature-height, 40px);
				}

				.default-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: 30px;
					width: var(--thumb-width, 12px);
					border-style: solid;
					border-width: 4px;
					border-radius: var(--thumb-border-radius, 12px);
					border-color: var(--color, var(--feature-color));
					background: #ffffff;
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 12px) / 2)) 0 0 100vw
							var(--color, var(--feature-color)),
						-7px 0 0 8px var(--color, var(--feature-color))
					);
				}

				.default-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: 22px;
					width: var(--thumb-width, 4px);
					border-style: solid;
					border-width: 4px;
					border-radius: var(--thumb-border-radius, 12px);
					border-color: var(--color, var(--feature-color));
					background: #ffffff;
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 12px) / 2)) 0 0 100vw
							var(--color, var(--feature-color)),
						-7px 0 0 8px var(--color, var(--feature-color))
					);
				}

				.flat-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--thumb-width, 16px);
				}

				.flat-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--thumb-width, 16px);
				}

				.line-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: 28px;
					width: var(--thumb-width, 10px);
					border-style: solid;
					border-color: #ffffff;
					border-width: 3px;
					border-radius: var(--thumb-border-radius, 12px);
					background: #8a8c99;
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						0 7px 0 0 #ffffff,
						0 -7px 0 0 #ffffff
					);
				}

				.line-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: 24px;
					width: var(--thumb-width, 4px);
					border-style: solid;
					border-color: #ffffff;
					border-width: 3px;
					border-radius: var(--thumb-border-radius, 12px);
					background: #8a8c99;
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						0 7px 0 0 #ffffff,
						0 -7px 0 0 #ffffff
					);
				}

				.round-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--feature-height, 40px);
					background: var(--color, var(--feature-color));
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--feature-height, 40px) / 2)) 0 0
							100vw var(--color, var(--feature-color))
					);
					border-radius: var(
						--thumb-border-radius,
						var(--feature-height, 40px)
					);
				}

				.round-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--thumb-width, var(--feature-height, 40px));
					border-color: var(--color, var(--feature-color));
					background: var(--color, var(--feature-color));
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(
								-100vw - (var(
												--thumb-width,
												var(--feature-height, 40px)
											) / 2)
							)
							0 0 100vw var(--color, var(--feature-color))
					);
					border-radius: var(
						--thumb-border-radius,
						var(--feature-height, 40px)
					);
				}

				.off > ::-webkit-slider-thumb {
					visibility: hidden;
				}

				.off > ::-moz-range-thumb {
					visibility: hidden;
				}

				.thumb {
					height: var(--feature-height, 40px);
					width: var(--thumb-width, var(--feature-height, 40px));
					position: absolute;
					translate: var(--thumb-offset) 0;
					transition:
						translate 180ms ease-in-out,
						background 180ms ease-in-out;
				}
				.thumb.flat {
					background: var(--color, var(--feature-color));
					box-shadow: var(
						--thumb-box-shadow,
						calc(
								-100vw - (var(
												--thumb-width,
												var(--feature-height, 40px)
											) / 2)
							)
							0 0 100vw var(--color, var(--feature-color))
					);
				}
				.off > .thumb {
					visibility: hidden;
				}

				.tooltip {
					background: var(--clear-background-color);
					color: var(--primary-text-color);
					position: absolute;
					border-radius: 0.8em;
					padding: 0.2em 0.4em;
					height: 20px;
					width: fit-content;
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
					display: var(--tooltip-display);
				}
				.faded-out {
					opacity: 0;
					transition: opacity 180ms ease-in-out 0s;
				}
				.faded-in {
					opacity: 1;
					transition: opacity 540ms ease-in-out 0s;
				}
				.tooltip::after {
					content: var(--tooltip-label, '0');
				}
			`,
		];
	}
}
