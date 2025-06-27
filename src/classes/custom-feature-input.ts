import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement } from 'lit/decorators.js';
import {
	COLOR_MAX,
	COLOR_MIN,
	DATE_MAX,
	DATE_MIN,
	DATETIME_MAX,
	DATETIME_MIN,
	MONTH_MAX,
	MONTH_MIN,
	RANGE_MAX,
	RANGE_MIN,
	STEP,
	STEP_COUNT,
	TIME_MAX,
	TIME_MIN,
	WEEK_MAX,
	WEEK_MIN,
} from '../models/constants';
import { InputType } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-input')
export class CustomFeatureInput extends BaseCustomFeature {
	thumb: InputType = 'text';
	range: [number, number] | [string, string] = [RANGE_MIN, RANGE_MAX];
	step: number = STEP;

	shouldFire: boolean = true;

	async onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		if (!this.swiping) {
			this.shadowRoot?.querySelector('input')?.focus();
		}
		this.endAction();
	}

	onFocus(_e: FocusEvent) {
		this.shadowRoot?.querySelector('input')?.focus();
	}

	async onBlur(e: FocusEvent) {
		const input = this.shadowRoot?.querySelector(
			'input',
		) as HTMLInputElement;
		if (this.shouldFire) {
			this.value = input.value;
			await this.sendAction('tap_action');
		}
		input.value = String(this.value ?? '');
		this.resetGetValueFromHass();
		this.shouldFire = true;
	}

	onChange(e: Event) {
		const input = this.shadowRoot?.querySelector(
			'input',
		) as HTMLInputElement;

		switch (this.thumb) {
			case 'date':
			case 'time':
			case 'datetime-local':
			case 'week':
			case 'month':
			case 'color':
				this.shouldFire = true;
				this.onBlur(new FocusEvent('blur', { ...e }));
				break;
			case 'number':
				if (this.precision) {
					input.value = Number(input.value).toFixed(this.precision);
				}
				break;
			case 'text':
			case 'password':
			default:
				break;
		}
	}

	async onKeyDown(e: KeyboardEvent) {
		this.getValueFromHass = false;
		const input = this.shadowRoot?.querySelector(
			'input',
		) as HTMLInputElement;

		if (!e.repeat && input && ['Enter', 'Escape'].includes(e.key)) {
			e.preventDefault();
			e.stopImmediatePropagation();
			this.shouldFire = e.key == 'Enter';
			input.blur();
		}
	}

	async onKeyUp(_e: KeyboardEvent) {}

	render() {
		this.setValue();

		this.thumb = this.renderTemplate(
			this.config.thumb ?? 'text',
		) as InputType;

		let min: string | number;
		let max: string | number;
		switch (this.thumb) {
			case 'date':
				min = DATE_MIN;
				max = DATE_MAX;
				break;
			case 'time':
				min = TIME_MIN;
				max = TIME_MAX;
				break;
			case 'datetime-local':
				min = DATETIME_MIN;
				max = DATETIME_MAX;
				break;
			case 'week':
				min = WEEK_MIN;
				max = WEEK_MAX;
				break;
			case 'month':
				min = MONTH_MIN;
				max = MONTH_MAX;
				break;
			case 'color':
				min = COLOR_MIN;
				max = COLOR_MAX;
				break;
			case 'text':
			case 'password':
			case 'number':
			default:
				min = RANGE_MIN;
				max = RANGE_MAX;
				break;
		}

		if (this.config.range) {
			const range = [
				(this.renderTemplate(
					this.config.range[0] as unknown as string,
				) as string) ?? min,
				(this.renderTemplate(
					this.config.range[1] as unknown as string,
				) as string) ?? max,
			];
			switch (this.thumb) {
				case 'text':
				case 'password':
				case 'number':
					this.range = [parseFloat(range[0]), parseFloat(range[1])];
					break;
				default:
					this.range = range as [string, string];
					break;
			}
		} else {
			this.range = [min, max] as [number, number] | [string, string];
		}

		if (this.config.step) {
			this.step = parseFloat(
				this.renderTemplate(
					this.config.step as unknown as string,
				) as string,
			);
		} else {
			switch (this.thumb) {
				case 'text':
				case 'password':
				case 'number':
					this.step =
						((this.range[1] as number) -
							(this.range[0] as number)) /
						STEP_COUNT;
					break;
				default:
					break;
			}
		}
		const splitStep = this.step.toString().split('.');
		if (splitStep.length > 1) {
			this.precision = splitStep[1].length;
		} else {
			this.precision = 0;
		}

		const input = html`
			<input
				type="${this.thumb}"
				part="input"
				tabindex="-1"
				enterkeyhint="done"
				min="${this.range[0]}"
				max="${this.range[1]}"
				step="${this.step}"
				value="${this.value ?? ''}"
				.value="${this.value ?? ''}"
				@keydown=${this.onKeyDown}
				@change=${this.onChange}
				@blur=${this.onBlur}
			/>
		`;

		return html`
			${this.buildBackground()} ${this.buildIcon(this.config.icon)}
			<div class="label-input">
				${this.buildLabel(this.config.label)} ${input}
			</div>
			<div class="line-ripple"></div>
		`;
	}

	firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);

		this.addEventListener('pointerdown', this.onPointerDown);
		this.addEventListener('pointermove', this.onPointerMove);
		this.addEventListener('pointerup', this.onPointerUp);
		this.addEventListener('focus', this.onFocus);

		this.removeEventListener('touchstart', this.onTouchStart);
		this.removeEventListener('touchend', this.onTouchEnd);
	}

	handleExternalClick = (e: MouseEvent) => {
		if (typeof e.composedPath && !e.composedPath().includes(this)) {
			this.shadowRoot?.querySelector('input')?.blur();
		}
	};

	connectedCallback() {
		super.connectedCallback();
		document.body.addEventListener('click', this.handleExternalClick);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		document.body.removeEventListener('click', this.handleExternalClick);
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					flex-direction: row;
					gap: 12px;
					border-radius: 0;
					border-top-left-radius: var(--mdc-shape-small, 4px);
					border-top-right-radius: var(--mdc-shape-small, 4px);
					padding: var(--text-field-padding, 0px 16px);
				}
				:host(:focus-within) {
					box-shadow: none;
				}

				.background {
					background: var(
						--background,
						var(--color, var(--mdc-text-field-fill-color, #f5f5f5))
					);
					opacity: var(--background-opacity, 1);
					pointer-events: none;
					z-index: 0;
				}
				.background::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: var(--mdc-ripple-color, rgba(0, 0, 0, 0.87));
					opacity: 0;
				}
				@media (hover: hover) {
					:host(:hover) .background::before {
						opacity: var(--mdc-ripple-hover-opacity, 0.04);
					}
				}

				.icon {
					color: var(
						--icon-color,
						var(
							--mdc-text-field-label-ink-color,
							rgba(0, 0, 0, 0.6)
						)
					);
					inset-inline-start: -4px;
				}

				.label-input {
					display: flex;
					flex-direction: column;
					justify-content: center;
					height: 100%;
					width: 100%;
				}
				.label {
					justify-content: flex-start;
					color: var(
						--label-color,
						var(
							--mdc-text-field-label-ink-color,
							rgba(0, 0, 0, 0.6)
						)
					);
					font-family: var(
						--mdc-typography-subtitle1-font-family,
						var(--mdc-typography-font-family, Roboto, sans-serif)
					);
					font-size: var(--mdc-typography-subtitle1-font-size, 10px);
					font-weight: var(
						--mdc-typography-subtitle1-font-weight,
						400
					);
					letter-spacing: var(
						--mdc-typography-subtitle1-letter-spacing,
						0.009375em
					);
					text-decoration: var(
						--mdc-typography-subtitle1-text-decoration,
						inherit
					);
					text-transform: var(
						--mdc-typography-subtitle1-text-transform,
						inherit
					);
					transform-origin: 0 50%;
					transition:
						scale 150ms cubic-bezier(0.4, 0, 0.2, 1),
						color 150ms cubic-bezier(0.4, 0, 0.2, 1);
				}
				:host(:focus-within) .label {
					color: var(--mdc-theme-primary, #6200ee);
				}
				:host(:not(:focus-within)) .label:has(~ input[value='']) {
					scale: 1.4;
				}
				:host(:not(:focus-within)) input[value=''] {
					height: 0;
					opacity: 0;
				}

				input {
					font-family: var(
						--mdc-typography-subtitle1-font-family,
						var(--mdc-typography-font-family, Roboto, sans-serif)
					);
					font-size: var(--mdc-typography-subtitle1-font-size, 1rem);
					font-weight: var(
						--mdc-typography-subtitle1-font-weight,
						400
					);
					letter-spacing: var(
						--mdc-typography-subtitle1-letter-spacing,
						0.009375em
					);
					text-decoration: var(
						--mdc-typography-subtitle1-text-decoration,
						inherit
					);
					text-transform: var(
						--mdc-typography-subtitle1-text-transform,
						inherit
					);
					color: var(--mdc-text-field-ink-color, rgba(0, 0, 0, 0.87));
					caret-color: var(
						--mdc-typography-subtitle1-text-transform,
						inherit
					);
					height: 100%;
					width: 100%;
					background: transparent;
					border: none;
					z-index: 1;
					transition:
						height 150ms cubic-bezier(0.4, 0, 0.2, 1),
						opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);

					-webkit-font-smoothing: antialiased;
					-moz-osx-font-smoothing: grayscale;
				}
				input:focus-visible {
					outline: none;
				}

				.line-ripple {
					position: absolute;
					bottom: 0;
					width: 100%;
				}
				.line-ripple::before,
				.line-ripple::after {
					content: '';
					display: block;
					width: 100%;
					position: absolute;
					bottom: 0;
				}
				.line-ripple::before {
					height: 1px;
					background: var(
						--mdc-text-field-idle-line-color,
						rgba(0, 0, 0, 0.42)
					);
					z-index: 1;
				}
				@media (hover: hover) {
					:host(:hover) .line-ripple::before {
						background: var(--mdc-theme-primary, #6200ee);
					}
				}
				.line-ripple::after {
					height: 2px;
					background: var(--mdc-theme-primary, #6200ee);
					z-index: 2;
					scale: 0 1;
					opacity: 0;
					transition:
						scale 180ms cubic-bezier(0.4, 0, 0.2, 1),
						opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
				}
				:host(:focus-within) .line-ripple::after {
					scale: 1 1;
					opacity: 1;
				}
			`,
		];
	}
}
