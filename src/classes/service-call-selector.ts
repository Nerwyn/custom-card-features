import { html, css, CSSResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { styleMap, StyleInfo } from 'lit/directives/style-map.js';

import { BaseServiceCallFeature } from './base-service-call-feature';
import './service-call-button';

@customElement('service-call-selector')
export class ServiceCallSelector extends BaseServiceCallFeature {
	onClick(e: MouseEvent) {
		const options = (e.currentTarget as HTMLElement).parentElement!
			.children;
		for (const option of options) {
			if (option.tagName.toLowerCase() == 'service-call-button') {
				const style = (option as HTMLElement).style;
				style.removeProperty('background-color');
				style.removeProperty('opacity');
			}
		}

		const style = (e.currentTarget as HTMLElement).style;
		style.setProperty('background-color', 'var(--selection-color)');
		style.setProperty('opacity', 'var(--selection-opacity)');
	}

	render() {
		super.render();

		const entries = this.evalEntry.options ?? [];
		let options =
			(this.hass.states[this.evalEntry.entity_id!].attributes
				.options as string[]) ?? new Array<string>(entries.length);
		if (options.length < entries.length) {
			options = Object.assign(new Array(entries.length), options);
		}

		const backgroundStyle: StyleInfo = {};
		if (this.evalEntry.background_color) {
			backgroundStyle.background = this.evalEntry.background_color;
		}
		if (
			this.evalEntry.background_opacity ||
			this.evalEntry.background_opacity == 0
		) {
			backgroundStyle.opacity = this.evalEntry.background_opacity;
		}
		const selector = [
			html`<div
				class="selector-background"
				style=${styleMap(backgroundStyle)}
			></div>`,
		];

		for (const i in entries) {
			const entry = this.evalEntry.options![i];

			if (!('service' in entry)) {
				entry.service = 'input_select.select_option';
				if (!('option' in entry.data!)) {
					entry.data!.option = options[i];
				}
			}

			if (!('opacity' in entry)) {
				entry.opacity = 0;
			}
			const option = entry.option ?? options[i];

			const style: StyleInfo = {};
			if (this.value == option && this.value != undefined) {
				style.backgroundColor = 'var(--selection-color)';
				style.opacity = 'var(--selection-opacity)';
			} else {
				style.backgroundColor = '';
				style.opacity = '';
			}
			if ('color' in entry) {
				style['--selection-color'] = entry.color;
			}
			if ('flex_basis' in entry) {
				style['flex-basis'] = entry.flex_basis;
			}

			selector.push(
				html`<service-call-button
					.hass=${this.hass}
					.entry=${entry}
					@click=${this.onClick}
					style=${styleMap(style)}
				/>`,
			);
		}
		const style: StyleInfo = {};
		if (this.evalEntry.color) {
			style['--selection-color'] = this.evalEntry.color;
		}
		if (this.evalEntry.opacity || this.evalEntry.opacity == 0) {
			style['--selection-opacity'] = this.evalEntry.opacity;
		}

		return html`<div class="container" style=${styleMap(style)}>
			${selector}
		</div>`;
	}

	static get styles() {
		return [
			super.styles as CSSResult,
			css`
				:host {
					flex-flow: row;
					--selection-opacity: 1;
					--selection-color: var(--tile-color);
				}

				.selector-background {
					position: absolute;
					width: inherit;
					height: inherit;
					background: var(--disabled-color);
					opacity: 0.2;
				}
			`,
		];
	}
}
