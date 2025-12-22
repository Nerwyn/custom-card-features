import { css, CSSResult, html, nothing, PropertyValues } from 'lit';
import { customElement } from 'lit/decorators.js';
import {
	COLOR_MAX,
	COLOR_MIN,
	DATE_MAX,
	DATE_MIN,
	DATETIME_MAX,
	DATETIME_MIN,
	DT_MAX,
	DT_MIN,
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
import { buildStyles } from '../utils/styles';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-input')
export class CustomFeatureInput extends BaseCustomFeature {
	thumb: InputType = 'text';
	range: [number, number] | [string, string] = [RANGE_MIN, RANGE_MAX];
	rangeTs?: [number, number];
	step: number = STEP;
	rangeIsLength: boolean = true;

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

	async onBlur(_e: FocusEvent) {
		const input = this.shadowRoot?.querySelector(
			'input',
		) as HTMLInputElement;
		if (input) {
			if (
				this.shouldFire &&
				this.value?.toString() != input.value?.toString() &&
				this.validate(input.value)
			) {
				this.value = input.value;
				await this.sendAction('tap_action');
			}
			input.value = String(this.value ?? '');
			this.validate(input.value);
		}
		this.resetGetValueFromHass();
		this.shouldFire = true;
	}

	onChange(e: Event) {
		const input = this.shadowRoot?.querySelector(
			'input',
		) as HTMLInputElement;

		if (input) {
			this.validate(input.value);

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
						input.value = Number(input.value).toFixed(
							this.precision,
						);
					}
					break;
				case 'text':
				case 'password':
				default:
					break;
			}
		}
	}

	async onKeyDown(e: KeyboardEvent) {
		this.getValueFromHass = false;

		if (!e.repeat && ['Enter', 'Escape'].includes(e.key)) {
			e.preventDefault();
			e.stopImmediatePropagation();

			const input = this.shadowRoot?.querySelector(
				'input',
			) as HTMLInputElement;
			this.shouldFire = e.key == 'Enter';
			input?.blur();
		}
	}

	async onKeyUp(e: KeyboardEvent) {
		if (!e.repeat) {
			const input = this.shadowRoot?.querySelector(
				'input',
			) as HTMLInputElement;
			if (input) {
				this.validate(input.value);
			}
		}
	}

	validate(value: string | number) {
		let valid = true;
		if (valid == undefined) {
			valid = false;
		} else {
			switch (this.thumb) {
				case 'week':
					value = String(value);
					if (!value.includes('-W')) {
						valid = false;
						break;
					}
					const [year, week] = value.split('-W');
					const weekDate =
						new Date(`${year}-01-01`).getTime() +
						(parseInt(week) - 1) * 7 * 24 * 60 * 60 * 1000;
					valid =
						weekDate >= (this.rangeTs ? this.rangeTs[0] : DT_MIN) &&
						weekDate <= (this.rangeTs ? this.rangeTs[1] : DT_MAX);
					break;
				case 'time':
					const time = new Date(`1970-01-01T${value}Z`).getTime();
					valid =
						time >= (this.rangeTs ? this.rangeTs[0] : 0) &&
						time <
							(this.rangeTs
								? this.rangeTs[1]
								: 1000 * 60 * 60 * 24);
					break;
				case 'month':
				case 'date':
				case 'datetime-local':
					const dt = new Date(value as string).getTime();
					valid =
						dt >= (this.rangeTs ? this.rangeTs[0] : DT_MIN) &&
						dt <= (this.rangeTs ? this.rangeTs[1] : DT_MAX);
					break;
				case 'number':
					valid = value >= this.range[0] && value <= this.range[1];
					break;
				case 'color':
				case 'text':
				case 'password':
				default:
					const len = (value as string).length;
					valid =
						len >= (this.range[0] as number) &&
						len <= (this.range[1] as number);
					break;
			}
		}

		if (valid) {
			this.removeAttribute('invalid');
		} else {
			this.setAttribute('invalid', '');
		}
		return valid;
	}

	render() {
		let value = this.value ?? '';
		if (
			value != undefined &&
			!isNaN(value as number) &&
			(value as string)?.trim?.() != '' &&
			this.precision != undefined
		) {
			value = Number(value).toFixed(this.precision);
		}

		const input = html`
			<input
				type="${this.thumb}"
				part="input"
				tabindex="-1"
				enterkeyhint="done"
				autocomplete="off"
				min="${this.rangeIsLength ? nothing : this.range[0]}"
				max="${this.rangeIsLength ? nothing : this.range[1]}"
				minlength="${this.rangeIsLength
					? (this.range[0] as number)
					: nothing}"
				maxlength="${this.rangeIsLength
					? (this.range[1] as number)
					: nothing}"
				step="${this.step}"
				value="${value}"
				.value="${value as string}"
				@keydown=${this.onKeyDown}
				@keyup=${this.onKeyUp}
				@change=${this.onChange}
				@blur=${this.onBlur}
			/>
		`;

		const unit = this.unitOfMeasurement
			? html`<span class="unit" part="unit"
					>${this.unitOfMeasurement}</span
				>`
			: '';

		return html`
			${this.buildBackground()} ${this.buildIcon(this.icon)}
			<div class="label-input">
				${this.buildLabel(this.label)}
				<div class="input-unit">${input}${unit}</div>
			</div>
			<div class="line-ripple" part="ripple"></div>
			${buildStyles(this.styles)}
		`;
	}

	willUpdate() {
		const input = this.shadowRoot?.querySelector(
			'input',
		) as HTMLInputElement;
		if (input) {
			this.validate(input.value);
		}
	}

	shouldUpdate(changedProperties: PropertyValues) {
		const unitOfMeasurement = this.unitOfMeasurement;
		const should = super.shouldUpdate(changedProperties);

		if (
			changedProperties.has('hass') ||
			changedProperties.has('stateObj') ||
			changedProperties.has('value')
		) {
			const thumb = this.renderTemplate(
				this.config.thumb ?? 'text',
			) as InputType;

			this.rangeIsLength = ['text', 'password'].includes(thumb);
			let min: string | number = this.renderTemplate(
				this.config.range?.[0] as unknown as string,
			) as string;
			let max: string | number = this.renderTemplate(
				this.config.range?.[1] as unknown as string,
			) as string;
			switch (this.thumb) {
				case 'date':
					min ||= DATE_MIN;
					max ||= DATE_MAX;
					break;
				case 'time':
					min ||= TIME_MIN;
					max ||= TIME_MAX;
					break;
				case 'datetime-local':
					min ||= DATETIME_MIN;
					max ||= DATETIME_MAX;
					break;
				case 'week':
					min ||= WEEK_MIN;
					max ||= WEEK_MAX;
					break;
				case 'month':
					min ||= MONTH_MIN;
					max ||= MONTH_MAX;
					break;
				case 'color':
					min = COLOR_MIN;
					max = COLOR_MAX;
					break;
				case 'text':
				case 'password':
				case 'number':
				default:
					min = parseFloat(min) || RANGE_MIN;
					max = parseFloat(max) || RANGE_MAX;
					break;
			}

			let step = parseFloat(
				this.renderTemplate(
					this.config.step as unknown as string,
				) as string,
			);
			if (!step || isNaN(step) || step <= 0) {
				switch (this.thumb) {
					case 'number':
						step = ((max as number) - (min as number)) / STEP_COUNT;
						break;
					case 'date':
					case 'time':
					case 'datetime-local':
					case 'week':
					case 'month':
						step ||= 1;
						break;
					default:
						step = STEP;
						break;
				}
			}

			const splitStep = String(this.step).split('.');
			let precision = 0;
			if (splitStep.length > 1) {
				precision = splitStep[1].length;
			}

			if (
				unitOfMeasurement != this.unitOfMeasurement ||
				thumb != this.thumb ||
				min != this.range[0] ||
				max != this.range[1] ||
				step != this.step ||
				precision != this.precision
			) {
				// Get timestamps for datetime type validation
				if (min != this.range[0] || max != this.range[1]) {
					switch (thumb) {
						case 'week':
							min = String(min);
							max = String(max);
							if (!min.includes('-W')) {
								min = WEEK_MIN;
							}
							if (!max.includes('-W')) {
								max = WEEK_MAX;
							}

							const [minYear, minWeek] = min.split('-W');
							const [maxYear, maxWeek] = max.split('-W');
							this.rangeTs = [
								new Date(`${minYear}-01-01`).getTime() +
									(parseInt(minWeek) - 1) *
										7 *
										24 *
										60 *
										60 *
										1000,
								new Date(`${maxYear}-01-01`).getTime() +
									(parseInt(maxWeek) - 1) *
										7 *
										24 *
										60 *
										60 *
										1000,
							];
							break;
						case 'time':
							this.rangeTs = [
								new Date(`1970-01-01T${min}Z`).getTime(),
								new Date(`1970-01-01T${max}Z`).getTime(),
							];
							break;
						case 'month':
						case 'date':
						case 'datetime-local':
						default:
							this.rangeTs = [
								new Date(min as string).getTime(),
								new Date(max as string).getTime(),
							];
							break;
					}
				}

				this.thumb = thumb;
				this.range = [min, max] as [number, number] | [string, string];
				this.step = step;
				this.precision = precision;
				return true;
			}
		}

		return should;
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
					border-radius: var(
						--md-sys-shape-corner-extra-small-top,
						var(--input-border-radius)
					);
					padding: var(--text-field-padding, 0px 16px);

					--input-border-radius: var(--mdc-shape-small, 4px)
						var(--mdc-shape-small, 4px) 0 0;
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
					min-width: 0;
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
				:host(:not(:focus-within))
					.label-input:has(input[value=''])
					.label {
					scale: 1.4;
				}
				:host(:not(:focus-within)) .input-unit:has(input[value='']) {
					height: 0;
					opacity: 0;
				}
				:host([dir='rtl']) .label {
					transform-origin: 100% 50%;
				}
				:host([invalid]) .label {
					color: var(--mdc-theme-error, #b00020);
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
					max-height: calc(
						var(--mdc-typography-subtitle1-font-size, 1rem) + 8px
					);
					min-width: 0;
					width: 100%;
					background: transparent;
					border: none;

					-webkit-font-smoothing: antialiased;
					-moz-osx-font-smoothing: grayscale;
				}
				input:focus-visible {
					outline: none;
				}

				input[type='color'] {
					appearance: none;
					-webkit-appearance: none;
					-moz-appearance: none;
					padding: 0;
					padding-bottom: 2px;
				}
				::-webkit-color-swatch-wrapper {
					padding: 0;
				}
				::-webkit-color-swatch {
					border: none;
					border-radius: 4px;
				}
				::-moz-color-swatch {
					border: none;
					border-radius: 4px;
				}

				.input-unit {
					display: flex;
					flex-direction: row;
					width: 100%;
					z-index: 1;
					transition:
						height 150ms cubic-bezier(0.4, 0, 0.2, 1),
						opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
				}
				.unit {
					color: var(--secondary-text-color);
					min-width: 0;
					padding-left: var(--text-field-suffix-padding-left, 12px);
					padding-right: var(--text-field-suffix-padding-right, 0px);
					padding-inline-start: var(
						--text-field-suffix-padding-left,
						12px
					);
					padding-inline-end: var(
						--text-field-suffix-padding-right,
						0px
					);
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
				:host([invalid]) .line-ripple::before,
				:host([invalid]) .line-ripple::after {
					background: var(--mdc-theme-error, #b00020);
				}
			`,
		];
	}
}
