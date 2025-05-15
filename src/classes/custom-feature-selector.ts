import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement } from 'lit/decorators.js';

import { BaseCustomFeature } from './base-custom-feature';
import './custom-feature-button';

@customElement('custom-feature-selector')
export class CustomFeatureSelector extends BaseCustomFeature {
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
		this.setValue();

		const selector = [this.buildBackground()];
		const options = this.config.options ?? [];
		for (const option of options) {
			option.haptics = option.haptics ?? this.config.haptics;
			selector.push(
				html`<custom-feature-button
					.hass=${this.hass}
					.config=${option}
					.shouldRenderRipple=${false}
					class="option"
					id=${this.renderTemplate(option.option as string)}
					@pointerdown=${this.onPointerDown}
					@pointerup=${this.onPointerUp}
					@pointermove=${this.onPointerMove}
					@pointercancel=${this.onPointerCancel}
					@pointerleave=${this.onPointerLeave}
					@contextmenu=${this.onContextMenu}
					@keydown=${this.optionOnKeyDown}
				/>`,
			);
		}

		return html`${selector}${this.buildStyles(this.config.styles)}`;
	}

	async onKeyDown(_e: KeyboardEvent) {
		// Firefox focused selector box shadow fix
		// Because :host:has() doesn't work with Firefox
		if (this.firefox) {
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
			optionElements[i].className = `${
				selected ? 'selected' : ''
			} option`;
		}
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					flex-flow: row;

					--color: var(--feature-color);
					--background: var(--disabled-color);
					--hover-opacity: 0.2;
				}
				:host:has(.option:focus-visible) {
					box-shadow: 0 0 0 2px var(--feature-color);
				}

				.option {
					--opacity: 0;
					--background-opacity: 0;
				}
				.option:focus-visible {
					box-shadow: none;
					--opacity: 0.2;
				}

				.selected {
					--opacity: 1;
					--background-opacity: 1;
					--hover-opacity: 1;
				}
				.selected:focus-visible {
					--opacity: 1;
				}
			`,
		];
	}
}
