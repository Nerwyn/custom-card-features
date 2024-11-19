import { css, CSSResult, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { IEntry } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-dropdown')
export class CustomFeatureDropdown extends BaseCustomFeature {
	@state() showDropdown: boolean = false;

	onStart(e: MouseEvent | TouchEvent) {
		clearTimeout(this.renderRippleOff);
		clearTimeout(this.renderRippleOn);
		this.renderRipple = true;
		this.swiping = false;
		if ('targetTouches' in e) {
			this.initialX = e.targetTouches[0].clientX;
			this.initialY = e.targetTouches[0].clientY;
		} else {
			this.initialX = e.clientX;
			this.initialY = e.clientY;
		}
	}

	onEnd(e: MouseEvent | TouchEvent) {
		if (!this.swiping) {
			// clearTimeout(this.getValueFromHassTimer);
			// this.getValueFromHass = false;
			// this.value = (e.currentTarget as HTMLElement).id;
			// this.resetGetValueFromHass();
			this.showDropdown = !this.showDropdown;
			this.toggleRipple();
		}
	}

	render() {
		this.setValue();

		const dropdownOptions = [];
		const options = this.config.options ?? [];
		let selectedOption: IEntry | undefined = undefined;
		for (const option of options) {
			const optionName = this.renderTemplate(option.option as string);
			if (
				this.value != undefined &&
				(this.value ?? '').toString() == (optionName ?? '').toString()
			) {
				selectedOption = option;
			}

			option.haptics = option.haptics ?? this.config.haptics;
			dropdownOptions.push(html`
				<custom-feature-dropdown-option
					.hass=${this.hass}
					.config=${option}
					.stateObj=${this.stateObj}
					id=${optionName}
				/>
			`);
		}
		const dropdown = this.showDropdown
			? html`<div class="dropdown">${options}</div>`
			: '';

		const select = html` <div class="select">
			<div
				class="background"
				@mousedown=${this.onMouseDown}
				@mouseup=${this.onMouseUp}
				@mousemove=${this.onMouseMove}
				@touchstart=${this.onTouchStart}
				@touchend=${this.onTouchEnd}
				@touchmove=${this.onTouchMove}
				@contextmenu=${this.onContextMenu}
			>
				${this.buildRipple()}
			</div>
			${selectedOption
				? html`${this.buildIcon(selectedOption)}${this.buildLabel(
						selectedOption,
					)}`
				: ''}
		</div>`;

		return html`${this.buildBackground()}${select}${dropdown}${this.buildStyles()}`;
	}

	updated() {
		const options = this.config.options ?? [];
		const optionElements = Array.from(
			this.shadowRoot?.querySelector('select')?.children ?? [],
		);
		for (const i in options) {
			const optionName = this.renderTemplate(options[i].option as string);
			let optionClass = 'option';
			if (
				this.value != undefined &&
				(this.value ?? '').toString() == (optionName ?? '').toString()
			) {
				optionClass = 'selected-option';
			}

			optionElements[i].className = optionClass;
		}
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					-webkit-tap-highlight-color: transparent;
					-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
					--md-ripple-hover-opacity: var(
						--ha-ripple-hover-opacity,
						0.08
					);
					--md-ripple-pressed-opacity: var(
						--ha-ripple-pressed-opacity,
						0.12
					);
					--ha-ripple-color: var(--secondary-text-color);
					--md-ripple-hover-color: var(
						--ha-ripple-hover-color,
						var(--ha-ripple-color, var(--secondary-text-color))
					);
					--md-ripple-pressed-color: var(
						--ha-ripple-pressed-color,
						var(--ha-ripple-color, var(--secondary-text-color))
					);
				}
				.select {
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 10px;
					padding: 6px 10px;
				}
				.down-arrow {
					position: absolute;
					right: 0px;
					--mdc-icon-size: 20px;
				}
			`,
		];
	}
}

@customElement('custom-feature-dropdown-option')
export class CustomFeatureDropdownOption extends BaseCustomFeature {
	onStart(_e: MouseEvent | TouchEvent) {
		clearTimeout(this.renderRippleOff);
		clearTimeout(this.renderRippleOn);
		this.renderRipple = true;
		this.swiping = false;
		this.fireHapticEvent('light');
	}

	onEnd(_e: MouseEvent | TouchEvent) {
		if (!this.swiping) {
			this.sendAction('tap_action');
			this.toggleRipple();
		}
	}

	onMouseLeave(_e: MouseEvent) {
		this.endAction();
		this.swiping = true;
		this.toggleRipple();
	}

	onTouchCancel(_e: TouchEvent) {
		this.toggleRipple();
	}

	render() {
		this.setValue();

		return html`<div class="container">
				${this.buildBackground()}${this.buildIcon()}${this.buildLabel()}${this.buildRipple()}
			</div>
			${this.buildStyles()}`;
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					height: var(--mdc-menu-item-height, 48px);
					width: 100%;
				}
				.background {
				}
			`,
		];
	}
}
