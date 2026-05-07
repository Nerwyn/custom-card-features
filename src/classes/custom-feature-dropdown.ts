import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
	DropdownThumbType,
	DropdownThumbTypes,
	IEntry,
	IOption,
} from '../models/interfaces';
import { buildStyles } from '../utils/styles';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-dropdown')
export class CustomFeatureDropdown extends BaseCustomFeature {
	@state() open: boolean = false;
	resizeObserver: ResizeObserver = new ResizeObserver(() => {
		this.style.setProperty('--dropdown-width', `${this.clientWidth}px`);
	});

	thumbType: DropdownThumbType = 'default';
	shouldRenderRipple: boolean = false;

	selectedIcon: string = '';
	selectedLabel: string = '';
	selectedStyles: string = '';

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
		if (Math.abs(Math.abs(totalDeltaX) - Math.abs(totalDeltaY)) > sensitivity) {
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

	sizeAndPositionDropdown() {
		if (this.open) {
			// Calculate dropdown height without vertical scroll
			let optionHeight = parseInt(
				this.style.getPropertyValue('--ha-space-10').replace(/D/g, ''),
			);
			optionHeight = isNaN(optionHeight) ? 40 : optionHeight;
			const dropdownHeight0 =
				optionHeight * (this.config.options?.length ?? 0) + 8;

			// Determine dropdown direction
			const rect = this.getBoundingClientRect();
			const edgeOffset = 32;
			let down = true;
			if (
				// If dropdown is too large
				dropdownHeight0 > window.innerHeight - edgeOffset - rect.bottom &&
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
			if (this.rtl) {
				dropdownElement.style.setProperty(
					'right',
					`${window.innerWidth - rect.right}px`,
				);
			} else {
				dropdownElement.style.setProperty('left', `${rect.left}px`);
			}
			dropdownElement.style.setProperty(
				down ? 'top' : 'bottom',
				`${down ? rect.bottom : window.innerHeight - rect.top}px`,
			);
			dropdownElement.style.removeProperty(down ? 'bottom' : 'top');
		}
	}

	render() {
		const dropdownOptions = [];
		const options = this.config.options ?? [];
		for (const option0 of options) {
			const option = structuredClone(option0);
			const optionName = String(this.renderTemplate(option.option as string));

			option.haptics = option.haptics ?? this.config.haptics;
			option.label = option.label || option.icon ? option.label : option.option;

			dropdownOptions.push(html`
				<custom-feature-dropdown-option
					.hass=${this.hass}
					.config=${option}
					.stateObj=${this.stateObj}
					id=${optionName}
					class="option"
					part="dropdown-option"
				></custom-feature-dropdown-option>
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
				${this.selectedIcon || this.selectedLabel || this.selectedStyles
					? html`${this.buildIcon(this.selectedIcon) ||
						html`<div class="icon"></div>`}${this.buildLabel(
							this.selectedLabel,
						)}${buildStyles(this.selectedStyles)}`
					: ''}
				${this.buildRipple()}
			</div>
			<ha-icon
				class="down-arrow"
				part="down-arrow"
				.icon=${'mdi:menu-down'}
			></ha-icon>
		</div>`;

		return html`${select}${dropdown}${buildStyles(this.styles)}`;
	}

	shouldUpdate(changedProperties: PropertyValues) {
		let should = super.shouldUpdate(changedProperties);
		if (
			changedProperties.has('hass') ||
			changedProperties.has('stateObj') ||
			changedProperties.has('value')
		) {
			let thumbType = this.renderTemplate(
				this.config.thumb as string,
			) as DropdownThumbType;
			thumbType = DropdownThumbTypes.includes(thumbType)
				? thumbType
				: 'default';

			if (thumbType != this.thumbType) {
				should = true;
				this.thumbType = thumbType;
				this.classList.add(thumbType);
				if (thumbType.startsWith('md3')) {
					this.shouldRenderRipple = true;
					if (thumbType.startsWith('md3-fab')) {
						this.classList.add('md3-fab');
					} else if (thumbType.startsWith('md3')) {
						this.classList.add('md3');
					}
				} else {
					this.shouldRenderRipple = false;
					this.classList.remove(
						...Array.from(this.classList.values()).filter((c) =>
							c.startsWith('md3'),
						),
					);
				}
			}

			let selectedOption: IEntry | undefined = undefined;
			for (const option of this.config.options ?? []) {
				const optionName = String(this.renderTemplate(option.option as string));
				if (String(this.value) == optionName) {
					selectedOption = option;
					break;
				}
			}

			if (selectedOption) {
				const selectedIcon = this.renderTemplate(
					selectedOption.icon as string,
				) as string;

				const selectedLabel = this.renderTemplate(
					(selectedOption.label || selectedOption.icon
						? selectedOption.label
						: (selectedOption as IOption).option) as string,
				) as string;

				const selectedStyles = this.renderTemplate(
					selectedOption.styles as string,
				) as string;

				if (
					selectedIcon != this.selectedIcon ||
					selectedLabel != this.selectedLabel ||
					selectedStyles != this.selectedStyles ||
					thumbType != this.thumbType
				) {
					this.selectedIcon = selectedIcon;
					this.selectedLabel = selectedLabel;
					this.selectedStyles = selectedStyles;
					return true;
				}
			} else {
				if (this.selectedIcon || this.selectedLabel || this.selectedStyles) {
					this.selectedIcon = '';
					this.selectedLabel = '';
					this.selectedStyles = '';
					return true;
				}
			}
		}

		if (should || changedProperties.has('open')) {
			return true;
		}

		// Update child hass objects if not updating
		const children = (this.shadowRoot?.querySelectorAll('.option') ??
			[]) as BaseCustomFeature[];
		for (const child of children) {
			child.hass = this.hass;
		}

		return false;
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
						String(this.renderTemplate(options[i].option as string));
					optionElements[i].className = `${selected ? 'selected' : ''} option`;
					optionElements[i].setAttribute('tabindex', '0');
					if (selected) {
						optionElements[i].focus();
					}
				} else {
					optionElements[i].removeAttribute('tabindex');
				}
			}

			this.sizeAndPositionDropdown();
		}
	}

	handleExternalClick = (e: MouseEvent) => {
		// eslint-disable-next-line no-constant-binary-expression
		if (typeof e.composedPath && !e.composedPath().includes(this)) {
			this.open = false;
		}
	};

	handleOnScroll = (_e: Event) => {
		this.sizeAndPositionDropdown();
	};

	connectedCallback() {
		super.connectedCallback();
		document.addEventListener('click', this.handleExternalClick);
		document.addEventListener('scroll', this.handleOnScroll);
		this.resizeObserver.observe(this);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener('click', this.handleExternalClick);
		document.removeEventListener('scroll', this.handleOnScroll);
		this.resizeObserver.disconnect();
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
					font-size: var(--ha-font-size-m, 14px);
					font-style: normal;
					font-weight: var(--ha-font-weight-normal, 400);
					letter-spacing: 0.25px;
				}
				.dropdown {
					position: fixed;
					z-index: 8;
					color: var(--primary-text-color);
					background: var(--card-background-color);
					border: var(--wa-border-style) var(--wa-border-width-s)
						var(--wa-color-surface-border);
					border-radius: var(--wa-border-radius-m, 8px);
					padding: var(--ha-space-1, 4px);
					height: min-content;
					width: var(--dropdown-width);
					box-sizing: border-box;
					will-change: transform, opacity;
					overflow-y: auto;
					transform: scale(1);
					opacity: 1;
					transition:
						opacity 0.03s linear,
						transform 0.12s cubic-bezier(0, 0, 0.2, 1),
						height 250ms cubic-bezier(0, 0, 0.2, 1);
					box-shadow: var(--wa-shadow-m);
				}
				.collapsed {
					height: 0;
					opacity: 0;
					transform: scale(0);
				}

				.option {
					height: var(--ha-space-10, 40px);
					width: 100%;
					min-width: 100px;
					border-radius: var(--wa-border-radius-s, 4px);

					--color: rgb(0, 0, 0, 0);
					--background: var(--wa-color-neutral-fill-normal);
					--background-opacity: 0;
				}
				.selected {
					color: var(--primary-color);

					--background: var(
						--ha-color-fill-primary-quiet-resting,
						hsl(from var(--primary-color) h s 5)
					);
					--background-opacity: 1;
				}
				.option::part(background) {
					pointer-events: none;
				}
				.option::part(label) {
					justify-content: flex-start;
					font: inherit;
				}
				.selected::part(label) {
					font-weight: var(--ha-font-weight-medium, 500);
				}
				.option::part(icon) {
					color: var(--icon-color, var(--secondary-text-color));
				}
				.option::part(dropdown-option-content) {
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

				:host([dir='rtl']) .down-arrow {
					right: unset;
					left: 10px;
				}

				@media (hover: hover) {
					:host(:hover) .background {
						--background: var(--ha-color-on-neutral-quiet);
					}
					.option:hover {
						--background-opacity: 1;
					}
					.selected:hover {
						--background: var(--ha-color-fill-primary-quiet-hover);
					}
				}
				.option:focus-visible {
					box-shadow: none;
					z-index: 1;
					outline: var(--wa-focus-ring);
					background-color: var(--wa-color-neutral-fill-normal);
				}

				/* Material Design 3 Dropdowns */
				@media (hover: hover) {
					:host(:not(.md3, .md3-baseline):hover) .background {
						--background: var(--ha-color-on-neutral-quiet);
					}
					:host(:not(.md3, .md3-baseline):hover) .option:hover {
						--background-opacity: 1;
					}
					:host(:not(.md3, .md3-baseline):hover) .selected:hover {
						--background: var(--ha-color-fill-primary-quiet-hover);
					}
				}
				:host {
					--md-ripple-hover-opacity: 0.08;
					--md-ripple-pressed-opacity: 0.1;
				}
				:host(.md3) .dropdown {
					border: none;
					border-radius: var(--md-sys-shape-corner-large, 16px);
					box-shadow: var(--md-sys-elevation-level2, var(--wa-shadow-m));
				}
				:host(.md3) .option {
					border-radius: var(--md-sys-shape-corner-extra-small, 4px);
				}
				:host(.md3) .option:first-of-type {
					border-top-left-radius: var(--md-sys-shape-corner-medium, 12px);
					border-top-right-radius: var(--md-sys-shape-corner-medium, 12px);
				}
				:host(.md3) .option:last-of-type {
					border-bottom-left-radius: var(--md-sys-shape-corner-medium, 12px);
					border-bottom-right-radius: var(--md-sys-shape-corner-medium, 12px);
				}
				:host(.md3) .selected {
					border-radius: var(--md-sys-shape-corner-medium, 12px);
				}
				:host(.md3-standard) .dropdown {
					background: var(
						--md-sys-color-surface-container-low,
						var(--ha-card-background, var(--card-background-color))
					);
				}
				:host(.md3-standard) .option {
					--md-ripple-hover-color: var(
						--md-sys-color-on-surface,
						var(--primary-text-color)
					);
					--md-ripple-pressed-color: var(
						--md-sys-color-on-surface,
						var(--primary-text-color)
					);
				}
				:host(.md3-standard) .option::part(label) {
					color: var(
						--label-color,
						var(--md-sys-color-on-surface, var(--primary-text-color))
					);
				}
				:host(.md3-standard) .option::part(icon) {
					color: var(
						--icon-color,
						var(--md-sys-color-on-surface-variant, var(--state-icon-color))
					);
				}
				:host(.md3-standard) .selected {
					--background: var(
						--md-sys-color-tertiary-container,
						var(--error-color)
					);
					--md-ripple-hover-color: var(
						--md-sys-color-on-tertiary-container,
						var(--disabled-text-color)
					);
					--md-ripple-pressed-color: var(
						--md-sys-color-on-tertiary-container,
						var(--disabled-text-color)
					);
				}
				:host(.md3-standard) .selected::part(label) {
					color: var(
						--label-color,
						var(
							--md-sys-color-on-tertiary-container,
							var(--disabled-text-color)
						)
					);
				}
				:host(.md3-standard) .selected::part(icon) {
					color: var(
						--icon-color,
						var(
							--md-sys-color-on-tertiary-container,
							var(--disabled-text-color)
						)
					);
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
		if (Math.abs(Math.abs(totalDeltaX) - Math.abs(totalDeltaY)) > sensitivity) {
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
				${this.buildIcon(this.icon)}${this.buildLabel(this.label)}
				${this.buildRipple()}
			</div>
			${buildStyles(this.styles)}`;
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
}
