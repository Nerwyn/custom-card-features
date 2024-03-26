import { html, css, CSSResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { renderTemplate } from 'ha-nunjucks';

import { BaseServiceCallFeature } from './base-service-call-feature';

@customElement('service-call-spinbox')
export class ServiceCallSpinbox extends BaseServiceCallFeature {
	step: number = 1;
	debounceTimer?: ReturnType<typeof setTimeout>;
	debounceTime: number = 1000;
	scrolling: boolean = false;

	onStart(_e: TouchEvent | MouseEvent) {
		clearTimeout(this.debounceTimer);
		clearTimeout(this.getValueFromHassTimer);
		this.getValueFromHass = false;
		this.scrolling = false;
	}

	onEnd(e: TouchEvent | MouseEvent) {
		if (!this.scrolling) {
			clearTimeout(this.debounceTimer);
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;

			const prevValue = parseFloat(this.value as string);
			const operator = (e.currentTarget as HTMLElement).id as
				| 'increment'
				| 'decrement';

			if (
				operator in this.entry &&
				'tap_action' in this.entry[operator]! &&
				renderTemplate(
					this.hass,
					this.entry[operator]!.tap_action!.action,
				) != 'none'
			) {
				this.sendAction('tap_action', this.entry[operator]);
			} else {
				switch (operator) {
					case 'increment':
						this.value = prevValue + this.step;
						break;
					case 'decrement':
						this.value = prevValue - this.step;
						break;
					default:
						break;
				}
				this.debounceTimer = setTimeout(() => {
					this.sendAction('tap_action');
					this.resetGetValueFromHass();
				}, this.debounceTime);
			}
		}

		this.scrolling = false;
	}

	onMove(_e: TouchEvent | MouseEvent) {
		this.scrolling = true;
	}

	buildBackground() {
		const style = structuredClone(this.entry.background_style ?? {});
		for (const key in style) {
			style[key] = renderTemplate(
				this.hass,
				style[key] as string,
			) as string;
		}
		return html`
			<div class="spinbox-background" style=${styleMap(style)}></div>
		`;
	}

	buildButton(operator: 'increment' | 'decrement') {
		if (!(operator in this.entry)) {
			this.entry[operator] = {};
		}
		if (!('icon' in this.entry[operator]!)) {
			this.entry[operator]!.icon =
				operator == 'increment' ? 'mdi:plus' : 'mdi:minus';
		}

		return html`
			<button
				class="button"
				id="${operator}"
				@mousedown=${this.onMouseDown}
				@mouseup=${this.onMouseUp}
				@mousemove=${this.onMouseMove}
				@touchstart=${this.onTouchStart}
				@touchend=${this.onTouchEnd}
				@touchmove=${this.onTouchMove}
				@contextmenu=${this.onContextMenu}
			>
				${this.buildIcon(this.entry[operator])}
				${this.buildLabel(this.entry[operator])}
			</button>
		`;
	}

	render() {
		this.setValue();

		if (this.entry.step) {
			this.step = parseFloat(
				renderTemplate(
					this.hass,
					this.entry.step as unknown as string,
				) as string,
			);
		}

		if ('debounce_time' in this.entry) {
			this.debounceTime = parseFloat(
				renderTemplate(
					this.hass,
					this.entry.debounce_time as unknown as string,
				) as string,
			);
		}

		return html`
			${this.buildBackground()}${this.buildButton('decrement')}
			${this.buildIcon()}${this.buildLabel()}
			${this.buildButton('increment')}
		`;
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					place-content: center;

					--background: var(--color, var(--state-inactive-color));
					--background-opacity: 0.2;
				}

				.spinbox-background {
					position: absolute;
					width: inherit;
					height: inherit;
					background: var(--background, var(--disabled-color));
					opacity: var(--background-opacity);
					z-index: 1;
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
					border: none;
					padding: 10px;
					color: inherit;
					z-index: 2;

					--mdc-icon-size: 16px;
				}

				#decrement {
					left: 0px;
				}

				#increment {
					right: 0px;
				}
			`,
		];
	}
}
