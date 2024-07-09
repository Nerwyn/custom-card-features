import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StyleInfo, styleMap } from 'lit/directives/style-map.js';

import { IEntry } from '../models/interfaces';
import { BaseServiceCallFeature } from './base-service-call-feature';
import style from '../styles/slider.css' assert { type: 'css' };

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
			this.setThumbOffset();
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
			this.setThumbOffset();
			this.setSliderState(this.currentValue as number);
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
		}

		this.speed = (this.range[1] - this.range[0]) / 50;

		if (this.entry.step) {
			this.step = parseFloat(
				this.renderTemplate(
					this.entry.step as unknown as string,
				) as string,
			);
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
		const customThumbWidth = parseInt(
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
		if (customThumbWidth) {
			this.thumbWidth = customThumbWidth;
		}
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

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.resizeObserver.disconnect();
	}

	static styles = [super.styles, style];
}
