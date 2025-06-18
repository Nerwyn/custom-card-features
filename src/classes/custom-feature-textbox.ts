import { css, CSSResult, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { RANGE_MAX, RANGE_MIN, STEP, STEP_COUNT } from '../models/constants';
import { TextBoxType } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-textbox')
export class CustomFeatureTextbox extends BaseCustomFeature {
	range: [number, number] = [RANGE_MIN, RANGE_MAX];
	step: number = STEP;

	async onKeyDown(e: KeyboardEvent) {
		this.getValueFromHass = false;
		const input = e.target as HTMLInputElement;
		if (!e.repeat && input && ['Enter', 'Escape'].includes(e.key)) {
			e.preventDefault();
			e.stopImmediatePropagation();

			switch (e.key) {
				case 'Enter':
					this.value = input.value;
					this.fireHapticEvent('light');
					await this.sendAction('tap_action');
					this.endAction();
					this.resetGetValueFromHass();
					break;
				case 'Escape':
				default:
					input.value = String(this.value);
					this.endAction();
					this.getValueFromHass = true;
					break;
			}
		}
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

		const label = this.renderTemplate(this.config.label ?? '');
		const thumb = this.renderTemplate(
			this.config.thumb ?? 'text',
		) as TextBoxType;

		switch (thumb) {
			case 'number':
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

				return html`
					<input
						type="number"
						part="number"
						tabindex="-1"
						min="${this.range[0]}"
						max="${this.range[1]}"
						step="${this.step}"
						placeholder="${label}"
						value="${this.value}"
						.value="${this.value}"
						@keydown=${this.onKeyDown}
					/>
				`;
			case 'text':
			default:
				const pattern = this.renderTemplate(this.config.pattern ?? '');

				return html`
					<input
						type="text"
						part="text"
						tabindex="-1"
						minlength="${this.range[0]}"
						maxlength="${this.range[1]}"
						pattern="${pattern}"
						placeholder="${label}"
						value="${this.value}"
						.value="${this.value}"
						@keydown=${this.onKeyDown}
					/>
				`;
		}
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				input {
					height: 100%;
					width: 100%;
				}
			`,
		];
	}
}
