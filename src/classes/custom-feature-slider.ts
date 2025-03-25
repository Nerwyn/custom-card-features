import { css, CSSResult, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StyleInfo, styleMap } from 'lit/directives/style-map.js';

import {
	RANGE_MAX,
	RANGE_MIN,
	SLIDER_ANIMATION,
	STEP,
	STEP_COUNT,
} from '../models/constants';
import { SliderThumbType } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-slider')
export class CustomFeatureSlider extends BaseCustomFeature {
	@state() showTooltip: boolean = false;
	@state() thumbOffset: number = 0;
	@state() sliderOn: boolean = true;
	@state() currentValue = this.value;

	oldValue?: number;
	newValue?: number;
	speed: number = 2;
	range: [number, number] = [RANGE_MIN, RANGE_MAX];
	step: number = STEP;
	intervalId?: ReturnType<typeof setTimeout>;

	@state() sliderWidth: number = 0;
	thumbWidth: number = 0;
	sliderClass: string = 'slider ';
	resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			this.sliderWidth = entry.contentRect.width;
			this.setThumbOffset();
		}
	});

	onInput(e: InputEvent) {
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping && this.initialX && this.initialY) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this.value = slider.value;

			this.fireHapticEvent('selection');

			const start = parseFloat(
				(this.oldValue as unknown as string) ?? this.value ?? '0',
			);
			const end = parseFloat(slider.value ?? start);
			this.newValue = end;

			this.currentValue = start;
			this.setThumbOffset();
			this.showTooltip = true;

			if (end > this.range[0]) {
				this.sliderOn = true;
			}

			clearInterval(this.intervalId);
			this.intervalId = undefined;
			let i = start;
			if (start > end) {
				this.intervalId = setInterval(() => {
					i -= this.speed;
					this.currentValue = i;
					this.setThumbOffset();

					if (end >= i) {
						clearInterval(this.intervalId);
						this.intervalId = undefined;
						this.currentValue = end;
						this.setThumbOffset();
					}
				}, SLIDER_ANIMATION);
			} else if (start < end) {
				this.sliderOn = true;
				this.intervalId = setInterval(() => {
					i += this.speed;
					this.currentValue = i;
					this.setThumbOffset();

					if (end <= i) {
						clearInterval(this.intervalId);
						this.intervalId = undefined;
						this.currentValue = end;
						this.setThumbOffset();
					}
				}, SLIDER_ANIMATION);
			} else {
				this.currentValue = end;
			}

			this.oldValue = end;
		} else {
			if (this.value == undefined) {
				this.getValueFromHass = true;
			}
			this.setValue();
			this.currentValue = this.value ?? 0;
			this.setThumbOffset();
			this.showTooltip = false;
		}
	}

	onPointerDown(e: PointerEvent) {
		super.onPointerDown(e);
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this.currentValue = slider.value;
			this.value = slider.value;
			this.setThumbOffset();
			this.showTooltip = true;
			this.sliderOn = true;
		}
	}

	async onPointerUp(_e: PointerEvent) {
		this.setThumbOffset();
		this.showTooltip = false;
		this.setValue();

		if (!this.swiping && this.initialX && this.initialY) {
			if (!this.newValue && this.newValue != 0) {
				this.newValue = Number(this.value);
			}
			if (!this.precision) {
				this.newValue = Math.trunc(this.newValue);
			}
			this.value = this.newValue;

			this.fireHapticEvent('light');
			await this.sendAction('tap_action');
		} else {
			this.getValueFromHass = true;
			this.setValue();
			this.currentValue = this.value ?? 0;
			this.setThumbOffset();
			this.setSliderState(this.currentValue as number);
		}

		this.endAction();
		this.resetGetValueFromHass();
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);

		// Only consider significant enough movement
		const sensitivity = 40;
		if (
			Math.abs((this.currentX ?? 0) - (this.initialX ?? 0)) <
			Math.abs((this.currentY ?? 0) - (this.initialY ?? 0)) - sensitivity
		) {
			this.swiping = true;
			this.getValueFromHass = true;
			this.setValue();
			this.currentValue = this.value ?? 0;
			this.setThumbOffset();
			this.showTooltip = false;
			this.setSliderState(this.value as number);
		}
	}

	setValue() {
		super.setValue();
		if (this.getValueFromHass) {
			this.oldValue = Number(this.value);
			if (this.newValue == undefined) {
				this.newValue = Number(this.value);
			}
		}
	}

	setThumbOffset() {
		const maxOffset = (this.sliderWidth - this.thumbWidth) / 2;
		const value = Number(
			this.getValueFromHass ? this.value : this.currentValue,
		);
		this.thumbOffset = Math.min(
			Math.max(
				Math.round(
					((this.sliderWidth - this.thumbWidth) /
						(this.range[1] - this.range[0])) *
						(value - (this.range[0] + this.range[1]) / 2),
				),
				-1 * maxOffset,
			),
			maxOffset,
		);
	}

	setSliderState(value: number) {
		this.sliderOn =
			!(
				value == undefined ||
				this.hass.states[this.entityId as string].state == 'off' ||
				(this.entityId?.startsWith('timer.') &&
					this.hass.states[this.entityId as string].state == 'idle')
			) || (Number(value) as number) > this.range[0];
	}

	buildTooltip() {
		return html`
			<div
				class="tooltip ${this.showTooltip ? 'faded-in' : 'faded-out'}"
			></div>
		`;
	}

	buildSlider(context: object) {
		const style: StyleInfo = {};
		if (
			this.renderTemplate(
				this.config.tap_action?.action as string,
				context,
			) == 'none'
		) {
			style['pointer-events'] = 'none';
		}

		const value = context['value' as keyof typeof context] as number;
		return html`
			<input
				id="slider"
				type="range"
				class="${this.sliderClass}"
				style=${styleMap(style)}
				min="${this.range[0]}"
				max="${this.range[1]}"
				step=${this.step}
				value="${value}"
				.value="${value}"
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

	buildSliderStyles(context: object) {
		const styles = `
			:host {
				--tooltip-label: '${this.renderTemplate('{{ value }}{{ unit }}', context)}';
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
		`;

		return html`<style>
			${styles}
		</style>`;
	}

	render() {
		this.setValue();
		if (this.getValueFromHass) {
			this.currentValue = this.value;
		}
		const context = {
			value: this.getValueFromHass ? this.value : this.currentValue,
		};

		if (this.config.range) {
			this.range[0] = parseFloat(
				(this.renderTemplate(
					this.config.range[0] as unknown as string,
					context,
				) as string) ?? RANGE_MIN,
			);
			this.range[1] = parseFloat(
				(this.renderTemplate(
					this.config.range[1] as unknown as string,
					context,
				) as string) ?? RANGE_MAX,
			);
		}

		this.speed = (this.range[1] - this.range[0]) / 50;

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
		this.setSliderState(context['value' as keyof typeof context] as number);

		this.resizeObserver.observe(
			this.shadowRoot?.querySelector('.container') ?? this,
		);

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
				${this.buildBackground()}${this.buildSlider(context)}
				${this.buildIcon(this.config.icon, context)}
				${this.buildLabel(this.config.label, context)}
			</div>
			${this.buildTooltip()}${this.buildSliderStyles(context)}
			${this.buildStyles(this.config.styles, context)}
		`;
	}

	async onKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowLeft':
				e.preventDefault();
				this.getValueFromHass = false;
				this.showTooltip = true;
				this.currentValue = Math.max(
					Math.min(
						((this.currentValue ??
							this.value ??
							this.range[0]) as number) - this.step,
						this.range[1],
					),
					this.range[0],
				);
				break;
			case 'ArrowRight':
				e.preventDefault();
				this.getValueFromHass = false;
				this.showTooltip = true;
				this.currentValue = Math.max(
					Math.min(
						((this.currentValue ??
							this.value ??
							this.range[0]) as number) + this.step,
						this.range[1],
					),
					this.range[0],
				);
				break;
			default:
				break;
		}
	}

	async onKeyUp(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowRight':
				e.preventDefault();
				this.showTooltip = false;
				this.value = this.currentValue;
				await this.sendAction('tap_action');
				this.endAction();
				this.resetGetValueFromHass();
				break;
			default:
				break;
		}
	}

	firstUpdated() {
		super.firstUpdated();
		this.addEventListener('keyup', this.onKeyUp);
		const input = this.shadowRoot?.querySelector('input');
		input?.removeAttribute('tabindex');
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
					--height: var(--feature-height, 40px);
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
					background: var(--color, var(--feature-color));
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 16px) / 2)) 0 0 100vw
							var(--color, var(--feature-color))
					);
					border-radius: var(--thumb-border-radius, 0);
				}

				.flat-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: var(--feature-height, 40px);
					width: var(--thumb-width, 16px);
					border-color: var(--color, var(--feature-color));
					background: var(--color, var(--feature-color));
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 16px) / 2)) 0 0 100vw
							var(--color, var(--feature-color))
					);
					border-radius: var(--thumb-border-radius, 0);
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
					height: var(--height);
					width: var(--thumb-width, var(--height));
					background: var(--color, var(--feature-color));
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, var(--height)) / 2)) 0
							0 100vw var(--color, var(--feature-color))
					);
					border-radius: var(--thumb-border-radius, var(--height));
				}

				.round-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: var(--height);
					width: var(--thumb-width, var(--height));
					border-color: var(--color, var(--feature-color));
					background: var(--color, var(--feature-color));
					cursor: pointer;
					opacity: var(--opacity, 1);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, var(--height)) / 2)) 0
							0 100vw var(--color, var(--feature-color))
					);
					border-radius: var(--thumb-border-radius, var(--height));
				}

				.off > ::-webkit-slider-thumb {
					visibility: hidden;
				}

				.off > ::-moz-range-thumb {
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
							calc(-0.5 * var(--height) - 0.4em - 10px)
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
