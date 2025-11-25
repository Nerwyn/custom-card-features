import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement } from 'lit/decorators.js';

import { SelectorThumbType, SelectorThumbTypes } from '../models/interfaces';
import { buildStyles } from '../utils/styles';
import { BaseCustomFeature } from './base-custom-feature';
import './custom-feature-button';

@customElement('custom-feature-selector')
export class CustomFeatureSelector extends BaseCustomFeature {
	thumbType: SelectorThumbType = 'default';

	onPointerUp(e: PointerEvent) {
		super.onPointerUp(e);
		if (!this.swiping && this.initialX && this.initialY) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this.value = (e.currentTarget as HTMLElement).id;
			this.resetGetValueFromHass();
			this.endAction();
		}
	}

	render() {
		const selector = [this.buildBackground()];
		const options = this.config.options ?? [];
		for (const option0 of options) {
			const option = structuredClone(option0);
			option.haptics = option.haptics ?? this.config.haptics;
			selector.push(
				html`<custom-feature-button
					.hass=${this.hass}
					.config=${option}
					.stateObj=${this.stateObj}
					.shouldRenderRipple=${this.thumbType != 'default'}
					class="option"
					part="selector-option"
					id=${this.renderTemplate(option.option as string)}
					@pointerdown=${this.onPointerDown}
					@pointerup=${this.onPointerUp}
					@pointermove=${this.onPointerMove}
					@pointercancel=${this.onPointerCancel}
					@pointerleave=${this.onPointerLeave}
					@contextmenu=${this.onContextMenu}
					@keydown=${this.optionOnKeyDown}
				></custom-feature-button>`,
			);
		}

		return html`${selector}${buildStyles(this.styles)}`;
	}

	async onKeyDown(_e: KeyboardEvent) {
		// Firefox focused selector box shadow fix
		// Because :host:has() doesn't work with Firefox
		if (this.firefox && !this.thumbType.startsWith('md3')) {
			this.style.setProperty(
				'box-shadow',
				'0 0 0 2px var(--feature-color)',
			);
		}
	}
	async onKeyUp(e: KeyboardEvent) {
		this.onKeyDown(e);
	}

	async optionOnKeyDown(e: KeyboardEvent) {
		if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
			e.preventDefault();
			const direction =
				(e.key == 'ArrowLeft') != this.rtl ? 'previous' : 'next';
			let target = (e.currentTarget as HTMLElement)?.[
				`${direction}ElementSibling`
			] as HTMLElement | null;
			if (!target?.className?.includes('option')) {
				const optionElements =
					this.shadowRoot?.querySelectorAll('.option');
				if (optionElements) {
					target = optionElements[
						(e.key == 'ArrowLeft') != this.rtl
							? optionElements.length - 1
							: 0
					] as HTMLElement;
				}
			}
			target?.focus();
		}
	}

	onFocus(_e: FocusEvent) {
		const options = this.config.options ?? [];
		const optionElements = this.shadowRoot?.querySelectorAll(
			'.option',
		) as unknown as HTMLElement[];
		for (const i in options) {
			const selected =
				String(this.value) ==
				String(this.renderTemplate(options[i].option as string));
			if (selected) {
				optionElements[i].focus();
			}
		}
	}

	onFocusOut(_e: FocusEvent) {
		// Firefox focused selector box shadow fix
		// Because :host:has() doesn't work with Firefox
		if (this.firefox) {
			this.style.removeProperty('box-shadow');
		}
	}

	shouldUpdate(changedProperties: PropertyValues) {
		const should = super.shouldUpdate(changedProperties);
		if (
			changedProperties.has('hass') ||
			changedProperties.has('stateObj') ||
			changedProperties.has('value')
		) {
			let thumbType = this.renderTemplate(
				this.config.thumb as string,
			) as SelectorThumbType;
			thumbType = SelectorThumbTypes.includes(thumbType)
				? thumbType
				: 'default';

			if (thumbType != this.thumbType) {
				this.thumbType = thumbType;
				this.classList.add(thumbType);
				if (thumbType.startsWith('md3')) {
					this.classList.add('md3');
				} else {
					this.classList.remove(
						...Array.from(this.classList.values()).filter((c) =>
							c.startsWith('md3'),
						),
					);
				}
				return true;
			}
		}

		if (should) {
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

	firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);
		this.removeAttribute('tabindex');
		this.addEventListener('focus', this.onFocus);
		this.addEventListener('focusout', this.onFocusOut);
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);
		const options = this.config.options ?? [];
		const optionElements = this.shadowRoot?.querySelectorAll(
			'.option',
		) as unknown as HTMLElement[];
		for (const i in options) {
			const selected =
				String(this.value) ==
				String(this.renderTemplate(options[i].option as string));
			optionElements[i].classList.add('option');
			if (this.thumbType.startsWith('md3')) {
				optionElements[i].classList.add('md3');
				optionElements[i].classList.add(this.thumbType);
			} else {
				optionElements[i].classList.remove(
					...Array.from(optionElements[i].classList.values()).filter(
						(c) => c.startsWith('md3'),
					),
				);
			}
			optionElements[i].classList.add('option');
			if (selected) {
				optionElements[i].classList.add('selected');
			} else {
				optionElements[i].classList.remove('selected');
			}
		}
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					flex-flow: row;
				}
				:host(:not(.md3)) {
					--color: var(--feature-color);
					--background: var(--disabled-color);
					--hover-opacity: 0.2;
				}
				:host:has(.option:focus-visible) {
					box-shadow: 0 0 0 2px var(--feature-color);
				}

				.option:not(.md3) {
					--opacity: 0;
					--background-opacity: 0;
				}
				.option:not(.md3):focus-visible {
					box-shadow: none;
					--opacity: 0.2;
				}

				.selected:not(.md3) {
					--opacity: 1;
					--background-opacity: 1;
					--hover-opacity: 1;
				}
				.selected:not(.md3):focus-visible {
					--opacity: 1;
				}

				@media (hover: hover) {
					.option:not(.md3)::part(button):hover {
						opacity: var(--hover-opacity);
						background: var(
							--color,
							var(--state-inactive-color, var(--disabled-color))
						);
					}
				}
				.option:not(.md3)::part(button):active {
					opacity: var(--hover-opacity);
					background: var(
						--color,
						var(--state-inactive-color, var(--disabled-color))
					);
				}

				/* Material Design 3 */
				:host(.md3) {
					gap: 2px;
					overflow: visible;
				}

				:host(.md3) .background {
					display: none;
				}

				:host(.md3) .option:nth-of-type(1)::part(button) {
					border-start-start-radius: calc(
						var(--feature-height, 40px) / 2
					);
					border-end-start-radius: calc(
						var(--feature-height, 40px) / 2
					);
				}
				:host(.md3)
					:not([pressed], .selected).option:nth-of-type(1)::part(
						button
					) {
					border-start-end-radius: var(
						--md-sys-shape-corner-small,
						8px
					);
					border-end-end-radius: var(
						--md-sys-shape-corner-small,
						8px
					);
				}
				:host(.md3) .option:nth-last-of-type(1)::part(button) {
					border-start-end-radius: calc(
						var(--feature-height, 40px) / 2
					);
					border-end-end-radius: calc(
						var(--feature-height, 40px) / 2
					);
				}
				:host(.md3)
					:not([pressed], .selected).option:nth-last-of-type(1)::part(
						button
					) {
					border-start-start-radius: var(
						--md-sys-shape-corner-small,
						8px
					);
					border-end-start-radius: var(
						--md-sys-shape-corner-small,
						8px
					);
				}

				:host(.md3) .option:not(.selected) {
					--md-button-border-radius: var(
						--md-sys-shape-corner-small,
						8px
					);
				}
				:host(.md3) .option.selected {
					--md-button-border-radius: calc(
						var(--feature-height, 40px) / 2
					);
				}
				:host(.md3) .option[pressed] {
					--md-button-border-radius: var(
						--md-sys-shape-corner-extra-small,
						4px
					);
				}

				:host(.md3:focus-visible),
				:host(.md3):has(.option:focus-visible) {
					box-shadow: none;
				}
			`,
		];
	}
}
