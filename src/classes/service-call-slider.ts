import { html, css, CSSResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { renderTemplate } from 'ha-nunjucks';

import { BaseServiceCallFeature } from './base-service-call-feature';

@customElement('service-call-slider')
export class ServiceCallSlider extends BaseServiceCallFeature {
	oldValue?: number;
	newValue?: number;
	speed: number = 2;
	range: [number, number] = [0, 100];
	class: string = 'slider';

	onInput(e: InputEvent) {
		e.preventDefault();
		e.stopImmediatePropagation();

		const slider = e.currentTarget as HTMLInputElement;
		const start = parseFloat(
			(this.oldValue as unknown as string) ?? this.value ?? '0',
		);
		const end = parseFloat(slider.value ?? start);
		slider.value = start.toString();
		this.newValue = end;

		if (end > this.range[0]) {
			slider.className = this.class;
		}

		let i = start;
		if (start > end) {
			const id = setInterval(() => {
				i -= this.speed;
				slider.value = i.toString();

				if (end >= i) {
					clearInterval(id);
					slider.value = end.toString();
					if (
						end <= this.range[0] &&
						this.class != 'slider-line-thumb'
					) {
						slider.className = 'slider-off';
					}
				}
			}, 1);
		} else if (start < end) {
			const id = setInterval(() => {
				i += this.speed;
				slider.value = i.toString();

				if (end <= i) {
					clearInterval(id);
					slider.value = end.toString();
				}
			}, 1);
		} else {
			slider.value = end.toString();
		}

		this.oldValue = end;
	}

	onEnd(_e: MouseEvent | TouchEvent) {
		if (!this.newValue && this.newValue != 0) {
			this.newValue = this.value as number;
		}
		if (this.newValue % 1 == 0) {
			this.newValue = Math.trunc(this.newValue);
		}
		this.value = this.newValue;

		this.callService();
	}

	render() {
		const icon_label = super.render();

		if (this.oldValue == undefined) {
			this.oldValue = parseFloat(this.value as string);
		}
		if (this.newValue == undefined) {
			this.newValue = parseFloat(this.value as string);
		}

		const entity_id = renderTemplate(
			this.hass,
			this.entry.entity_id as string,
		) as string;
		const [domain, _service] = (entity_id ?? '').split('.');

		if (this.entry.range) {
			this.range = [
				parseFloat(
					renderTemplate(
						this.hass,
						this.entry.range[0] as unknown as string,
					) as string,
				),
				parseFloat(
					renderTemplate(
						this.hass,
						this.entry.range[1] as unknown as string,
					) as string,
				),
			];
		} else if (['number', 'input_number'].includes(domain)) {
			this.range = [
				this.hass.states[entity_id].attributes.min,
				this.hass.states[entity_id].attributes.max,
			];
		}

		if (!('service' in this.entry)) {
			switch (domain) {
				case 'number':
					this.entry.service = 'number.set_value';
					break;
				case 'input_number':
				default:
					this.entry.service = 'input_number.set_value';
					break;
			}

			if (!('value' in this.entry.data!)) {
				this.entry.data!.value = 'VALUE';
			}
		}

		this.speed = (this.range[1] - this.range[0]) / 50;

		let step: number;
		if (this.entry.step) {
			step = this.entry.step;
		} else if (['number', 'input_number'].includes(domain)) {
			step = this.hass.states[entity_id].attributes.step;
		} else {
			step = (this.range[1] - this.range[0]) / 100;
		}

		const background_style = structuredClone(
			this.entry.background_style ?? {},
		);
		for (const key in background_style) {
			background_style[key] = renderTemplate(
				this.hass,
				background_style[key] as string,
			) as string;
		}
		const background = html`<div
			class="slider-background"
			style=${styleMap(background_style)}
		></div>`;

		this.class = 'slider';
		switch (renderTemplate(this.hass, this.entry.thumb as string)) {
			case 'line':
				this.class = 'slider-line-thumb';
				break;
			case 'flat':
				this.class = 'slider-flat-thumb';
				break;
			default:
				this.class = 'slider';
				break;
		}
		if (
			this.value == undefined ||
			(this.value == this.range[0] && this.class != 'slider-line-thumb')
		) {
			this.class = 'slider-off';
		}
		const slider_style = structuredClone(this.entry.slider_style ?? {});
		for (const key in slider_style) {
			slider_style[key] = renderTemplate(
				this.hass,
				slider_style[key] as string,
			) as string;
		}

		const slider = html`
			<input
				type="range"
				class="${this.class}"
				style=${styleMap(slider_style)}
				min="${this.range[0]}"
				max="${this.range[1]}"
				step=${step}
				value="${this.value}"
				@input=${this.onInput}
				@mouseup=${this.onEnd}
				@touchend=${this.onEnd}
			/>
		`;

		return html`${background}${slider}${icon_label}`;
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					--color: var(--tile-color);
					--background: var(--color, var(--state-inactive-color));
					--background-height: 100%;
					--background-opacity: 0.2;
					--opacity: 1;
				}

				.slider-background {
					position: absolute;
					width: inherit;
					height: var(--background-height);
					background: var(--background);
					opacity: var(--background-opacity);
				}

				.slider,
				.slider-line-thumb,
				.slider-flat-thumb,
				.slider-off {
					position: absolute;
					appearance: none;
					-webkit-appearance: none;
					-moz-appearance: none;
					height: inherit;
					border-radius: 10px;
					background: none;
				}

				.slider,
				.slider-flat-thumb,
				.slider-off {
					width: inherit;
					overflow: hidden;
				}

				.slider-line-thumb {
					width: calc(100% - 5px);
				}

				.slider::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: 30px;
					width: 12px;
					border-style: solid;
					border-width: 4px;
					border-radius: 12px;
					border-color: var(--color);
					background: #ffffff;
					cursor: pointer;
					opacity: var(--opacity);
					box-shadow:
						calc(-100vw - 6px) 0 0 100vw var(--color),
						-4px 0 0 6px var(--color);
				}

				.slider::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: 22px;
					width: 4px;
					border-style: solid;
					border-width: 4px;
					border-radius: 12px;
					border-color: var(--color);
					background: #ffffff;
					cursor: pointer;
					opacity: var(--opacity);
					box-shadow:
						calc(-100vw - 6px) 0 0 100vw var(--color),
						-4px 0 0 6px var(--color);
				}

				.slider-flat-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: 40px;
					width: 24px;
					background: var(--color);
					cursor: pointer;
					opacity: var(--opacity);
					z-index: 1;
					box-shadow: -100vw 0 0 100vw var(--color);
				}

				.slider-flat-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: 40px;
					width: 24px;
					border-color: var(--color);
					background: var(--color);
					cursor: pointer;
					opacity: var(--opacity);
					z-index: 1;
					box-shadow: -100vw 0 0 100vw var(--color);
				}

				.slider-line-thumb::-webkit-slider-thumb {
					appearance: none;
					-webkit-appearance: none;
					height: 28px;
					width: 10px;
					border-style: solid;
					border-color: #ffffff;
					border-width: 3px;
					border-radius: 12px;
					background: #8a8c99;
					cursor: pointer;
					opacity: var(--opacity);
					box-shadow:
						0 7px 0 0 #ffffff,
						0 -7px 0 0 #ffffff;
				}

				.slider-line-thumb::-moz-range-thumb {
					appearance: none;
					-moz-appearance: none;
					height: 24px;
					width: 4px;
					border-style: solid;
					border-color: #ffffff;
					border-width: 3px;
					border-radius: 12px;
					background: #8a8c99;
					cursor: pointer;
					opacity: var(--opacity);
					box-shadow:
						0 7px 0 0 #ffffff,
						0 -7px 0 0 #ffffff;
				}

				.slider-off::-webkit-slider-thumb {
					visibility: hidden;
				}

				.slider-off::-moz-range-thumb {
					visibility: hidden;
				}
			`,
		];
	}
}
