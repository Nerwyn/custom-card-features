import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { IEntry, IOption } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-dropdown')
export class CustomFeatureDropdown extends BaseCustomFeature {
	@state() open: boolean = false;

	onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		if (!this.swiping && this.initialX && this.initialY) {
			this.open = !this.open;
			this.endAction();
		}
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);

		// Only consider significant enough movement
		const sensitivity = 8;
		const totalDeltaX = (this.currentX ?? 0) - (this.initialX ?? 0);
		const totalDeltaY = (this.currentY ?? 0) - (this.initialY ?? 0);
		if (
			Math.abs(Math.abs(totalDeltaX) - Math.abs(totalDeltaY)) >
			sensitivity
		) {
			this.endAction();
			this.swiping = true;
		}
	}

	closeDropdown(e: Event) {
		const value = e.detail?.value;
		if (value != undefined) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this.value = value;
			this.resetGetValueFromHass();
		}
		if (e.detail.close) {
			this.open = false;
		}
	}

	render() {
		this.setValue();

		// Dropdown position and height
		if (this.open) {
			// Calculate dropdown height without vertical scroll
			let optionHeight = parseInt(
				this.style
					.getPropertyValue('--mdc-menu-item-height')
					.replace(/D/g, ''),
			);
			optionHeight = isNaN(optionHeight) ? 48 : optionHeight;
			const dropdownHeight0 =
				optionHeight * (this.config.options?.length ?? 0) + 16;

			// Determine dropdown direction
			const rect = this.getBoundingClientRect();
			const edgeOffset = 32;
			let down = true;
			if (
				// If dropdown is too large
				dropdownHeight0 >
					window.innerHeight - edgeOffset - rect.bottom &&
				// If dropdown is on lower half of window
				rect.top + rect.bottom > window.innerHeight
			) {
				down = false;
			}

			const dropdownElement = this.shadowRoot?.querySelector(
				'.dropdown',
			) as HTMLElement;
			dropdownElement.style.setProperty(
				'max-height',
				`${(down ? window.innerHeight - rect.bottom : rect.top) - edgeOffset - 16}px`,
			);
			this.rtl
				? dropdownElement.style.setProperty(
						'right',
						`${window.innerWidth - rect.right}px`,
					)
				: dropdownElement.style.setProperty('left', `${rect.left}px`);
			dropdownElement.style.setProperty(
				down ? 'top' : 'bottom',
				`${down ? rect.bottom : window.innerHeight - rect.top}px`,
			);
			dropdownElement.style.removeProperty(down ? 'bottom' : 'top');
		}

		const dropdownOptions = [];
		const options = this.config.options ?? [];
		let selectedOption: IEntry | undefined = undefined;
		for (const option of options) {
			const optionName = String(
				this.renderTemplate(option.option as string),
			);
			if (String(this.value) == optionName) {
				selectedOption = option;
			}

			option.haptics = option.haptics ?? this.config.haptics;
			option.label =
				option.label || option.icon ? option.label : option.option;
			dropdownOptions.push(html`
				<custom-feature-dropdown-option
					.hass=${this.hass}
					.config=${option}
					.stateObj=${this.stateObj}
					id=${optionName}
					class="option"
					part="dropdown-option"
				/>
			`);
		}
		const dropdown = html`<div
			class="dropdown ${this.open ? '' : 'collapsed'}"
			part="dropdown"
			tabindex="-1"
			@dropdown-close=${this.closeDropdown}
		>
			${dropdownOptions}
		</div>`;

		const select = html`<div class="container" part="container">
			${this.buildBackground()}
			<div
				class="select"
				part="select"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				${selectedOption
					? html`${this.buildIcon(
							selectedOption.icon,
						)}${this.buildLabel(
							selectedOption.label,
						)}${this.buildStyles(selectedOption.styles)}`
					: ''}
				${this.buildRipple()}
			</div>
			<ha-icon
				class="down-arrow"
				part="down-arrow"
				.icon=${'mdi:menu-down'}
			></ha-icon>
		</div>`;

		return html`${select}${dropdown}${this.buildStyles(
			this.config.styles,
		)}`;
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);
		if (changedProperties.has('open')) {
			const options = this.config.options ?? [];
			const optionElements = this.shadowRoot?.querySelectorAll(
				'.option',
			) as unknown as HTMLElement[];
			for (const i in options) {
				if (!changedProperties.get('open') && this.open) {
					const selected =
						String(this.value) ==
						String(
							this.renderTemplate(options[i].option as string),
						);
					optionElements[i].className = `${
						selected ? 'selected' : ''
					} option`;
					optionElements[i].setAttribute('tabindex', '0');
					if (selected) {
						optionElements[i].focus();
					}
				} else {
					optionElements[i].removeAttribute('tabindex');
				}
			}
		}
	}

	handleExternalClick = (e: MouseEvent) => {
		if (typeof e.composedPath && !e.composedPath().includes(this)) {
			this.open = false;
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
					overflow: visible;
					cursor: pointer;
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
				.background {
					pointer-events: none;
				}
				.select {
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: 10px;
					padding: 0 10px;
					height: 100%;
					width: 100%;
					box-sizing: border-box;
				}
				.down-arrow {
					position: absolute;
					right: 10px;
					pointer-events: none;
				}
				.label {
					justify-content: flex-start;
					font: inherit;
					opacity: 0.88;
				}
				.dropdown {
					position: fixed;
					z-index: 8;
					color: var(--mdc-theme-on-surface);
					background: var(--mdc-theme-surface);
					border-radius: var(--mdc-shape-medium, 4px);
					padding: 8px 0;
					height: min-content;
					will-change: transform, opacity;
					overflow-y: scroll;
					transform: scale(1);
					opacity: 1;
					transition:
						opacity 0.03s linear,
						transform 0.12s cubic-bezier(0, 0, 0.2, 1),
						height 250ms cubic-bezier(0, 0, 0.2, 1);
					box-shadow:
						0px 5px 5px -3px rgba(0, 0, 0, 0.2),
						0px 8px 10px 1px rgba(0, 0, 0, 0.14),
						0px 3px 14px 2px rgba(0, 0, 0, 0.12);
				}
				.collapsed {
					height: 0;
					opacity: 0;
					transform: scale(0);
				}
				.option {
					min-width: 100px;
					--md-ripple-pressed-opacity: 0.2;
				}
				.selected {
					color: var(--mdc-theme-primary, #6200ee);
					--ha-ripple-color: var(--mdc-theme-primary, #6200ee);
					--mdc-ripple-hover-color: var(--ha-ripple-color);
					--md-ripple-pressed-color: var(--ha-ripple-color);
					--background: var(--ha-ripple-color);
					--background-opacity: 0.26;
					--md-ripple-hover-opacity: 0;
					--md-ripple-pressed-opacity: 0.26;
				}

				:host([dir='rtl']) .down-arrow {
					right: unset;
					left: 10px;
				}
			`,
		];
	}
}

@customElement('custom-feature-dropdown-option')
export class CustomFeatureDropdownOption extends BaseCustomFeature {
	@property() config!: IOption;

	onPointerDown(e: PointerEvent) {
		super.onPointerDown(e);
		this.fireHapticEvent('light');
	}

	async onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		e.preventDefault();
		if (!this.swiping && this.initialX && this.initialY) {
			this.closeDropdown(
				this.renderTemplate(this.config.option as string) as string,
				Boolean(e.pointerType),
			);
			await this.sendAction('tap_action');
			this.endAction();
		}
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);

		// Only consider significant enough movement
		const sensitivity = 8;
		const totalDeltaX = (this.currentX ?? 0) - (this.initialX ?? 0);
		const totalDeltaY = (this.currentY ?? 0) - (this.initialY ?? 0);
		if (
			Math.abs(Math.abs(totalDeltaX) - Math.abs(totalDeltaY)) >
			sensitivity
		) {
			this.onPointerCancel(e);
		}
	}

	closeDropdown(value?: string, close?: boolean) {
		const event = new Event('dropdown-close', {
			bubbles: true,
			composed: true,
		});
		event.detail = {
			value,
			close,
		};
		this.dispatchEvent(event);
	}

	render() {
		this.setValue();

		return html`${this.buildBackground()}
			<div
				class="content"
				part="dropdown-option-content"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				${this.buildIcon(this.config.icon)}${this.buildLabel(
					this.config.label,
				)}${this.buildRipple()}
			</div>
			${this.buildStyles(this.config.styles)}`;
	}

	async onKeyDown(e: KeyboardEvent) {
		await super.onKeyDown(e);
		if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
			e.preventDefault();
			const direction = e.key == 'ArrowUp' ? 'previous' : 'next';
			let target = (e.currentTarget as HTMLElement)?.[
				`${direction}ElementSibling`
			] as HTMLElement | null;
			if (!target?.className?.includes('option')) {
				const optionElements = (
					this.getRootNode() as ShadowRoot
				)?.querySelectorAll('.option');
				if (optionElements) {
					target = optionElements[
						e.key == 'ArrowUp' ? optionElements.length - 1 : 0
					] as HTMLElement;
				}
			}
			target?.focus();
		}
	}

	firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);
		this.removeAttribute('tabindex');
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					height: var(--mdc-menu-item-height, 48px);
					width: 100%;
					overflow: visible;
					--color: rgb(0, 0, 0, 0);
				}
				:host(:focus-visible) {
					box-shadow: none;
					--background: var(--ha-ripple-color);
					--background-opacity: var(
						--ha-ripple-pressed-opacity,
						0.12
					);
				}
				.background {
					pointer-events: none;
				}
				.label {
					justify-content: flex-start;
					font: inherit;
				}
				.icon {
					color: var(
						--mdc-theme-text-icon-on-background,
						rgba(0, 0, 0, 0.38)
					);
				}
				.content {
					display: flex;
					flex-direction: row;
					align-items: center;
					padding-left: var(
						--mdc-list-side-padding-left,
						var(--mdc-list-side-padding, 20px)
					);
					padding-right: var(
						--mdc-list-side-padding-right,
						var(--mdc-list-side-padding, 20px)
					);
					gap: var(--mdc-list-item-graphic-margin, 24px);
					height: 100%;
					width: 100%;
					box-sizing: border-box;
				}
			`,
		];
	}
}
