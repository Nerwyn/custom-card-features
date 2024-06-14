import { html, css, CSSResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StyleInfo, styleMap } from 'lit/directives/style-map.js';

import { IAction, IEntry } from '../models/interfaces';
import { BaseServiceCallFeature } from './base-service-call-feature';

@customElement('service-call-slider')
export class ServiceCallSlider extends BaseServiceCallFeature {
	@state() showTooltip: boolean = false;
	@state() thumbOffset: number = 0;
	@state() sliderOn: boolean = true;
	@state() currentValue = this.value;

	oldValue?: number;
	newValue?: number;
	speed: number = 2;
	range: [number, number] = [0, 100];
	step: number = 1;
	intervalId?: ReturnType<typeof setTimeout>;

	sliderClass: string = 'slider ';
	thumbWidth: number = 0;
	sliderWidth: number = 0;
	resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			this.sliderWidth = entry.contentRect.width;
			this.setThumbOffset();
		}
	});

	onInput(e: InputEvent) {
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping) {
			this.getValueFromHass = false;
			clearTimeout(this.getValueFromHassTimer);
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
				}, 1);
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
				}, 1);
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

	onStart(e: MouseEvent | TouchEvent) {
		const slider = e.currentTarget as HTMLInputElement;

		if (!this.swiping) {
			this.getValueFromHass = false;
			clearTimeout(this.getValueFromHassTimer);
			this.currentValue = slider.value;
			this.value = slider.value;
			this.setThumbOffset;
			this.showTooltip = true;
			this.sliderOn = true;
		}
	}

	onEnd(_e: MouseEvent | TouchEvent) {
		this.setThumbOffset();
		this.showTooltip = false;
		this.setValue();

		if (!this.swiping) {
			if (!this.newValue && this.newValue != 0) {
				this.newValue = Number(this.value);
			}
			if (!this.precision) {
				this.newValue = Math.trunc(this.newValue);
			}
			this.value = this.newValue;

			this.fireHapticEvent('light');
			this.sendAction('tap_action');
		} else {
			this.getValueFromHass = true;
			this.setValue();
			this.currentValue = this.value ?? 0;
		}

		this.endAction();
		this.resetGetValueFromHass();
	}

	onMove(e: MouseEvent | TouchEvent) {
		let currentX: number;
		if ('clientX' in e) {
			currentX = e.clientX;
		} else {
			currentX = e.touches[0].clientX;
		}
		let currentY: number;
		if ('clientY' in e) {
			currentY = e.clientY;
		} else {
			currentY = e.touches[0].clientY;
		}

		if (this.initialY == undefined) {
			this.initialY = currentY;
		}
		if (this.initialX == undefined) {
			this.initialX = currentX;
		} else if (
			Math.abs(currentX - this.initialX) <
			Math.abs(currentY - this.initialY) - 40
		) {
			this.swiping = true;
			this.getValueFromHass = true;
			this.setValue();
			this.currentValue = this.value ?? 0;
			this.setThumbOffset();
			this.showTooltip = false;
			this.setSliderState(this.currentValue as number);
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
		console.log(this.thumbOffset);
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

	buildLabel(entry: IEntry = this.entry, context?: object) {
		return this.sliderOn ? super.buildLabel(entry, context) : html``;
	}

	buildTooltip(entry: IEntry = this.entry, context: object) {
		const style: StyleInfo = this.buildStyle(
			{
				...entry.tooltip_style,
				'--tooltip-label': `"${
					entry.tooltip_style?.['--tooltip-label'] ??
					entry.style?.['--tooltip-label'] ??
					`{{ value }}{{ unit }}`
				}"`,
				'--tooltip-transform':
					entry.tooltip_style?.['--tooltip-transform'] ??
					entry.style?.['--tooltip-transform'] ??
					'translate(var(--thumb-offset), -35px)',
				'--tooltip-display':
					entry.tooltip_style?.['--tooltip-display'] ??
					entry.style?.['--tooltip-display'] ??
					'initial',
			},
			context,
		);

		// Deprecated tooltip hide/show field
		if ('tooltip' in entry) {
			style['--tooltip-display'] = this.renderTemplate(
				entry.tooltip as unknown as string,
			)
				? 'initial'
				: 'none';
		}

		// prettier-ignore
		return html`
			<div
				class="tooltip ${this.showTooltip ? 'faded-in' : 'faded-out'}"
				style=${styleMap(style)}
			></div>
		`;
	}

	buildSlider(entry: IEntry = this.entry, context: object) {
		const style = this.buildStyle(entry.slider_style ?? {}, context);
		if (
			this.renderTemplate(entry.tap_action?.action as string, context) ==
			'none'
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
				@mousedown=${this.onMouseDown}
				@mouseup=${this.onMouseUp}
				@mousemove=${this.onMouseMove}
				@touchstart=${this.onTouchStart}
				@touchend=${this.onTouchEnd}
				@touchmove=${this.onTouchMove}
				@contextmenu=${this.onContextMenu}
			/>
		`;
	}

	render() {
		this.setValue();
		if (this.getValueFromHass) {
			this.currentValue = this.value;
		}
		const context = {
			VALUE: this.getValueFromHass ? this.value : this.currentValue,
			value: this.getValueFromHass ? this.value : this.currentValue,
		};

		const [domain, _service] = (this.entityId ?? '').split('.');

		if (this.entry.range) {
			this.range = [
				parseFloat(
					this.renderTemplate(
						this.entry.range[0] as unknown as string,
						context,
					) as string,
				),
				parseFloat(
					this.renderTemplate(
						this.entry.range[1] as unknown as string,
						context,
					) as string,
				),
			];
		} else if (['number', 'input_number'].includes(domain)) {
			this.range = [
				this.hass.states[this.entityId as string].attributes.min,
				this.hass.states[this.entityId as string].attributes.max,
			];
		}

		if (!this.entry.tap_action) {
			const tap_action = {} as IAction;
			tap_action.action = 'call-service';
			switch (domain) {
				case 'number':
					tap_action.service = 'number.set_value';
					break;
				case 'input_number':
				default:
					tap_action.service = 'input_number.set_value';
					break;
			}

			const data = tap_action.data ?? {};
			if (!data.value) {
				data.value = '{{ value }}';
				tap_action.data = data;
			}
			if (!data.entity_id) {
				data.entity_id = this.entityId as string;
				tap_action.data = data;
			}
			this.entry.tap_action = tap_action;
		}

		this.speed = (this.range[1] - this.range[0]) / 50;

		if (this.entry.step) {
			this.step = parseFloat(
				this.renderTemplate(
					this.entry.step as unknown as string,
				) as string,
			);
		} else if (['number', 'input_number'].includes(domain)) {
			this.step =
				this.hass.states[this.entityId as string].attributes.step;
		} else {
			this.step = (this.range[1] - this.range[0]) / 100;
		}
		const splitStep = this.step.toString().split('.');
		if (splitStep.length > 1) {
			this.precision = splitStep[1].length;
		} else {
			this.precision = 0;
		}

		this.sliderClass = 'slider ';
		switch (this.renderTemplate(this.entry.thumb as string)) {
			case 'line':
				this.sliderClass += 'line-thumb';
				this.thumbWidth = 10;
				break;
			case 'flat':
				this.sliderClass += 'flat-thumb';
				this.thumbWidth = 16;
				break;
			case 'round':
				this.sliderClass += 'round-thumb';
				this.thumbWidth = 40;
				break;
			default:
				this.sliderClass += 'default-thumb';
				this.thumbWidth = 12;
				break;
		}
		this.setSliderState(context['value' as keyof typeof context] as number);
		this.sliderClass = `${this.sliderClass}${this.sliderOn ? '' : ' off'}`;

		this.resizeObserver.observe(
			this.shadowRoot?.querySelector('.container') ?? this,
		);
		this.thumbWidth = parseInt(
			(
				(this.renderTemplate(
					this.entry.slider_style?.['--thumb-width'] as string,
					context,
				) as string) ??
				(this.renderTemplate(
					this.entry.style?.['--thumb-width'] as string,
					context,
				) as string) ??
				(this.style.getPropertyValue('--thumb-width') as string) ??
				'50'
			).replace('px', ''),
		);
		this.setThumbOffset();
		this.style.setProperty('--thumb-offset', `${this.thumbOffset}px`);

		return html`
			${this.buildTooltip(undefined, context)}
			<div class="container">
				${this.buildBackground(undefined, context)}
				${this.buildSlider(undefined, context)}
				${this.buildIcon(undefined, context)}
				${this.buildLabel(undefined, context)}
			</div>
		`;
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					overflow: visible;
					pointer-events: none;

					--color: var(--tile-color);
					--opacity: 1;
				}

				.slider {
					position: absolute;
					appearance: none;
					-webkit-appearance: none;
					-moz-appearance: none;
					height: inherit;
					background: none;
					pointer-events: all;
					z-index: 2;
				}

				.slider,
				.default-thumb,
				.flat-thumb,
				.round-thumb,
				.off {
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
					border-color: var(--color);
					background: #ffffff;
					cursor: pointer;
					opacity: var(--opacity);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 8px) / 2)) 0 0 100vw
							var(--color),
						-4px 0 0 6px var(--color)
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
					border-color: var(--color);
					background: #ffffff;
					cursor: pointer;
					opacity: var(--opacity);
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 4px) / 2)) 0 0 100vw
							var(--color),
						-4px 0 0 6px var(--color)
					);
				}

				.flat-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: 40px;
					width: var(--thumb-width, 16px);
					background: var(--color);
					cursor: pointer;
					opacity: var(--opacity);
					z-index: 2;
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 16px) / 2)) 0 0 100vw
							var(--color)
					);
					border-radius: var(--thumb-border-radius, 0);
				}

				.flat-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: 40px;
					width: var(--thumb-width, 16px);
					border-color: var(--color);
					background: var(--color);
					cursor: pointer;
					opacity: var(--opacity);
					z-index: 2;
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 16px) / 2)) 0 0 100vw
							var(--color)
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
					opacity: var(--opacity);
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
					opacity: var(--opacity);
					box-shadow: var(
						--thumb-box-shadow,
						0 7px 0 0 #ffffff,
						0 -7px 0 0 #ffffff
					);
				}

				.round-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: 40px;
					width: var(--thumb-width, 40px);
					background: var(--color);
					cursor: pointer;
					opacity: var(--opacity);
					z-index: 2;
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 40px) / 2)) 0 0 100vw
							var(--color)
					);
					border-radius: var(--thumb-border-radius, 40px);
				}

				.round-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: 40px;
					width: var(--thumb-width, 40px);
					border-color: var(--color);
					background: var(--color);
					cursor: pointer;
					opacity: var(--opacity);
					z-index: 2;
					box-shadow: var(
						--thumb-box-shadow,
						calc(-100vw - (var(--thumb-width, 40px) / 2)) 0 0 100vw
							var(--color)
					);
					border-radius: var(--thumb-border-radius, 40px);
				}

				.off::-webkit-slider-thumb {
					visibility: hidden;
				}

				.off::-moz-range-thumb {
					visibility: hidden;
				}

				.tooltip {
					z-index: 3;
					background: var(--clear-background-color);
					color: var(--primary-text-color);
					position: absolute;
					border-radius: 0.8em;
					padding: 0.2em 0.4em;
					height: 20px;
					width: fit-content;
					line-height: 20px;
					transform: var(--tooltip-transform);
					display: var(--tooltip-display);
				}
				.faded-out {
					opacity: 0;
					transition:
						opacity 180ms ease-in-out 0s,
						left 180ms ease-in-out 0s,
						bottom 180ms ease-in-out 0s;
				}
				.faded-in {
					opacity: 1;
					transition: opacity 540ms ease-in-out 0s;
				}
				.tooltip::after {
					content: var(--tooltip-label);
				}
			`,
		];
	}
}
