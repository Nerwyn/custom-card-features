import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement } from 'lit/decorators.js';

import { buildStyles } from '../utils/styles';
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
					.shouldRenderRipple=${false}
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
				/>`,
			);
		}

		return html`${selector}${buildStyles(this.styles)}`;
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

	shouldUpdate(changedProperties: PropertyValues) {
		const should = super.shouldUpdate(changedProperties);
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
