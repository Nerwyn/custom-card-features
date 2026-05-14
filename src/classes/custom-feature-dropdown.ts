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
		const dropdownElement = this.shadowRoot?.querySelector(
			'.dropdown',
		) as HTMLElement;
		dropdownElement.style.setProperty('width', `${this.clientWidth}px`);
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
			const optionHeight =
				this.shadowRoot?.querySelector('.option')?.clientHeight ?? 40;
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
					`${document.documentElement.clientWidth - rect.right}px`,
				);
			} else {
				dropdownElement.style.setProperty('left', `${rect.left}px`);
			}
			dropdownElement.style.setProperty(
				down ? 'top' : 'bottom',
				`${down ? rect.bottom : document.documentElement.clientHeight - rect.top}px`,
			);
			dropdownElement.style.removeProperty(down ? 'bottom' : 'top');
			if (this.thumbType.includes('md3')) {
				if (this.thumbType.includes('md3-fab')) {
					dropdownElement.style.setProperty(
						'transform-origin',
						this.rtl ? 'left' : 'right',
					);
				} else {
					dropdownElement.style.setProperty(
						'transform-origin',
						down ? 'top' : 'bottom',
					);
				}
			}
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
			class="dropdown"
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
					? html`${this.buildIcon(
							this.thumbType.includes('md3-fab') && this.open
								? 'mdi:close'
								: this.selectedIcon,
						) || html`<div class="icon"></div>`}${this.buildLabel(
							this.selectedLabel,
						)}${buildStyles(this.selectedStyles)}`
					: html`${this.buildIcon(
							this.thumbType.includes('md3-fab') && this.open
								? 'mdi:close'
								: this.icon,
						)}${this.buildLabel(this.label)}`}
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
					this.setAttribute('open', '');
					const selected =
						String(this.value) ==
						String(this.renderTemplate(options[i].option as string));
					optionElements[i].className = `${selected ? 'selected' : ''} option`;
					optionElements[i].setAttribute('tabindex', '0');
					if (selected) {
						optionElements[i].focus();
					}
				} else {
					this.removeAttribute('open');
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
					display: flex;
					flex-direction: column;
					color: var(--primary-text-color);
					background: var(--card-background-color);
					border: var(--wa-border-style) var(--wa-border-width-s)
						var(--wa-color-surface-border);
					border-radius: var(--wa-border-radius-m, 8px);
					padding: var(--ha-space-1, 4px);
					height: 0px;
					box-sizing: border-box;
					will-change: transform, opacity;
					overflow-y: auto;
					transform: scale(0);
					opacity: 1;
					transition:
						opacity 0.03s linear,
						transform 0.12s cubic-bezier(0, 0, 0.2, 1),
						height 250ms cubic-bezier(0, 0, 0.2, 1);
					box-shadow: var(--wa-shadow-m);
				}
				:host([open]) .dropdown {
					height: min-content;
					min-width: fit-content;
					transform: scale(1);
				}

				.option {
					height: var(--ha-space-10, 40px);
					width: 100%;
					min-width: 100px;
					border-radius: var(--wa-border-radius-s, 4px);
					flex: 0 0 auto;

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
					:host(:not(.md3, .md3-fab):hover) .background {
						--background: var(--ha-color-on-neutral-quiet);
					}
					:host(:not(.md3, .md3-fab):hover) .option:hover {
						--background-opacity: 1;
					}
					:host(:not(.md3, .md3-fab):hover) .selected:hover {
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
				:host(.md3) {
					--md-ripple-hover-opacity: 0.08;
					--md-ripple-pressed-opacity: 0.1;
				}
				:host(.md3) .dropdown {
					border: none;
					border-radius: var(--md-sys-shape-corner-large, 16px);
					box-shadow: var(--md-sys-elevation-level2, var(--ha-box-shadow-m));
					transform: scale(1, 0);
					transition: none;
				}
				:host([open].md3) .dropdown {
					transform: scale(1, 1);
					transition: transform var(--md-sys-motion-expressive-spatial-fast);
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
				:host(.md3) .option::part(label) {
					font-size: var(--md-sys-typescale-label-large-size, 14px);
					font-weight: var(--md-sys-typescale-label-large-weight, 500);
					line-height: var(--md-sys-typescale-label-large-line-height, 20px);
					letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
				}

				:host(.md3-standard) .dropdown {
					background: var(
						--md-sys-color-surface-container-low,
						var(--ha-sys-color-surface-container)
					);
				}
				:host(.md3-standard) .option {
					--md-ripple-hover-color: var(
						--md-sys-color-on-surface,
						var(--ha-sys-color-on-surface)
					);
					--md-ripple-pressed-color: var(
						--md-sys-color-on-surface,
						var(--ha-sys-color-on-surface)
					);
				}
				:host(.md3-standard) .option::part(label) {
					color: var(
						--label-color,
						var(--md-sys-color-on-surface, var(--ha-sys-color-on-surface))
					);
				}
				:host(.md3-standard) .option::part(icon) {
					color: var(
						--icon-color,
						var(
							--md-sys-color-on-surface-variant,
							var(--ha-sys-color-on-surface)
						)
					);
				}
				:host(.md3-standard) .selected {
					--background: var(
						--md-sys-color-tertiary-container,
						var(--ha-sys-color-tertiary-container)
					);
					--md-ripple-hover-color: var(
						--md-sys-color-on-tertiary-container,
						var(--ha-sys-color-on-tertiary-container)
					);
					--md-ripple-pressed-color: var(
						--md-sys-color-on-tertiary-container,
						var(--ha-sys-color-on-tertiary-container)
					);
				}
				:host(.md3-standard) .selected::part(label) {
					color: var(
						--label-color,
						var(
							--md-sys-color-on-tertiary-container,
							var(--ha-sys-color-on-tertiary-container)
						)
					);
				}
				:host(.md3-standard) .selected::part(icon) {
					color: var(
						--icon-color,
						var(
							--md-sys-color-on-tertiary-container,
							var(--ha-sys-color-on-tertiary-container)
						)
					);
				}

				:host(.md3-vibrant) .dropdown {
					background: var(
						--md-sys-color-tertiary-container,
						var(--ha-sys-color-tertiary-container)
					);
				}
				:host(.md3-vibrant) .option {
					--md-ripple-hover-color: var(
						--md-sys-color-on-tertiary-container,
						var(--ha-sys-color-on-tertiary-container)
					);
					--md-ripple-pressed-color: var(
						--md-sys-color-on-tertiary-container,
						var(--ha-sys-color-on-tertiary-container)
					);
				}
				:host(.md3-vibrant) .option::part(label) {
					color: var(
						--label-color,
						var(
							--md-sys-color-on-tertiary-container,
							var(--ha-sys-color-on-tertiary-container)
						)
					);
				}
				:host(.md3-vibrant) .option::part(icon) {
					color: var(
						--icon-color,
						var(
							--md-sys-color-on-tertiary-container,
							var(--ha-sys-color-on-tertiary-container)
						)
					);
				}
				:host(.md3-vibrant) .selected {
					--background: var(
						--md-sys-color-tertiary,
						var(--ha-sys-color-tertiary)
					);
					--md-ripple-hover-color: var(
						--md-sys-color-on-tertiary,
						var(--ha-sys-color-on-tertiary)
					);
					--md-ripple-pressed-color: var(
						--md-sys-color-on-tertiary,
						var(--ha-sys-color-on-tertiary)
					);
				}
				:host(.md3-vibrant) .selected::part(label) {
					color: var(
						--label-color,
						var(--md-sys-color-on-tertiary, var(--ha-sys-color-on-tertiary))
					);
				}
				:host(.md3-vibrant) .selected::part(icon) {
					color: var(
						--icon-color,
						var(--md-sys-color-on-tertiary, var(--ha-sys-color-on-tertiary))
					);
				}

				/* Material Design 3 FAB */
				:host(.md3-fab) {
					width: var(--feature-height);
					flex: none;
					justify-content: flex-start;
					align-items: flex-end;
					border-radius: clamp(
						16px,
						calc(0.5 * var(--feature-height, 40px) - 20px),
						28px
					);

					--mdc-icon-size: clamp(
						24px,
						calc(0.5 * var(--feature-height, 40px) - 12px),
						36px
					);
					--background-opacity: 1;
					--md-ripple-hover-opacity: 0.08;
					--md-ripple-pressed-opacity: 0.1;
					--md-ripple-hover-color: var(--md-button-on-background-color);
					--md-ripple-pressed-color: var(--md-button-on-background-color);
				}
				:host(.md3-fab) .container {
					box-shadow: var(--md-sys-elevation-level3, var(--ha-box-shadow-m));
					transition:
						height var(--md-sys-motion-expressive-spatial-fast),
						width var(--md-sys-motion-expressive-spatial-fast),
						border-radius var(--md-sys-motion-expressive-spatial-fast),
						box-shadow var(--md-sys-motion-expressive-effects-fast);
				}
				@media (hover: hover) {
					:host(.md3-fab) .container:hover {
						box-shadow: var(--md-sys-elevation-level4, var(--ha-box-shadow-l));
					}
				}
				:host([pressed].md3-fab) .container {
					box-shadow: var(--md-sys-elevation-level3, var(--ha-box-shadow-m));
				}
				:host(.md3-fab:focus-visible) {
					box-shadow: none;
				}
				:host(.md3-fab:focus-visible) .container {
					outline: 3px solid
						var(--md-sys-color-secondary, var(--ha-sys-color-secondary));
					outline-offset: 2px;
				}
				:host([open].md3-fab) .container {
					height: min(var(--feature-height, 40px), 56px);
					width: min(var(--feature-height, 40px), 56px);
					border-radius: var(--feature-height);
				}
				:host([open].md3-fab) .container {
					height: min(var(--feature-height, 40px), 56px);
					width: min(var(--feature-height, 40px), 56px);
					border-radius: var(--feature-height);
				}
				:host(.md3-fab) .select .icon {
					transition:
						height var(--md-sys-motion-expressive-spatial-fast),
						width var(--md-sys-motion-expressive-spatial-fast);
				}
				:host([open].md3-fab) .select .icon {
					--mdc-icon-size: 20px;
				}
				:host(.md3-fab) .background {
					background: var(
						--background,
						var(--color, var(--md-button-background-color))
					);
				}
				:host(.md3-fab) .icon {
					color: var(--icon-color, var(--md-button-on-background-color));
				}
				:host(.md3-fab) .label,
				:host(.md3-fab) .down-arrow {
					display: none;
				}
				:host(.md3-fab) .select {
					justify-content: center;
				}
				:host(.md3-fab) .dropdown {
					background: transparent;
					border: none;
					box-shadow: none;
					padding: 8px 0;
					overflow: visible;
					gap: 4px;
					align-items: flex-end;
					translate: calc(var(--feature-height) - 100%) 0;
					transform: scale(0, 1);
					transition: none;
				}
				:host([dir='rtl'].md3-fab) .dropdown {
					translate: calc(100% - var(--feature-height)) 0;
				}
				:host([open].md3-fab) .dropdown {
					transform: scale(1, 1);
					transition: transform var(--md-sys-motion-expressive-spatial-fast);
				}
				:host(.md3-fab) .option {
					height: 56px;
					min-width: fit-content;
					max-width: fit-content;
					border-radius: 56px;

					--background: var(--md-option-background-color);
					--background-opacity: 1;
				}
				:host(.md3-fab) .option:focus-visible {
					outline: 3px solid
						var(--md-sys-color-secondary, var(--ha-sys-color-secondary));
					outline-offset: 2px;
				}
				:host(.md3-fab) .option::part(dropdown-option-content) {
					padding: 0 24px;
					gap: 8px;
				}
				:host(.md3-fab) .option::part(icon) {
					color: var(--icon-color, var(--md-option-on-background-color));
				}
				:host(.md3-fab) .option::part(label) {
					color: var(--label-color, var(--md-option-on-background-color));
					font-size: var(--md-sys-typescale-title-medium-size, 16px);
					font-weight: var(--md-sys-typescale-title-medium-weight, 500);
					line-height: var(--md-sys-typescale-title-medium-line-height, 24px);
					letter-spacing: var(--md-sys-typescale-title-medium-tracking, 0.15px);
				}
				:host(.md3-fab) .selected {
					--background: var(--md-button-background-color);
					--background-opacity: 1;
				}
				:host(.md3-fab) .selected::part(icon) {
					color: var(--icon-color, var(--md-button-on-background-color));
				}
				:host(.md3-fab) .selected::part(label) {
					color: var(--label-color, var(--md-button-on-background-color));
				}

				:host(.md3-fab-primary) {
					--md-button-background-color: var(
						--md-sys-color-primary-container,
						var(--ha-sys-color-primary-container)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-primary-container,
						var(--ha-sys-color-on-primary-container)
					);
					--md-option-background-color: var(
						--md-sys-color-primary-container,
						var(--ha-sys-color-primary-container)
					);
					--md-option-on-background-color: var(
						--md-sys-color-on-primary-container,
						var(--ha-sys-color-on-primary-container)
					);
				}
				:host([open].md3-fab-primary) {
					--md-button-background-color: var(
						--md-sys-color-primary,
						var(--ha-sys-color-primary)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-primary,
						var(--ha-sys-color-on-primary)
					);
				}

				:host(.md3-fab-secondary) {
					--md-button-background-color: var(
						--md-sys-color-secondary-container,
						var(--ha-sys-color-secondary-container)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-secondary-container,
						var(--ha-sys-color-on-secondary-container)
					);
					--md-option-background-color: var(
						--md-sys-color-secondary-container,
						var(--ha-sys-color-secondary-container)
					);
					--md-option-on-background-color: var(
						--md-sys-color-on-secondary-container,
						var(--ha-sys-color-on-secondary-container)
					);
				}
				:host([open].md3-fab-secondary) {
					--md-button-background-color: var(
						--md-sys-color-secondary,
						var(--ha-sys-color-secondary)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-secondary,
						var(--ha-sys-color-on-secondary)
					);
				}

				:host(.md3-fab-tertiary) {
					--md-button-background-color: var(
						--md-sys-color-tertiary-container,
						var(--ha-sys-color-tertiary-container)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-tertiary-container,
						var(--ha-sys-color-on-tertiary-container)
					);
					--md-option-background-color: var(
						--md-sys-color-tertiary-container,
						var(--ha-sys-color-tertiary-container)
					);
					--md-option-on-background-color: var(
						--md-sys-color-on-tertiary-container,
						var(--ha-sys-color-on-tertiary-container)
					);
				}
				:host([open].md3-fab-tertiary) {
					--md-button-background-color: var(
						--md-sys-color-tertiary,
						var(--ha-sys-color-tertiary)
					);
					--md-button-on-background-color: var(
						--md-sys-color-on-tertiary,
						var(--ha-sys-color-on-tertiary)
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
