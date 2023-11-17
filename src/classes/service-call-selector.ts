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
				(option as HTMLElement).style.removeProperty(
					'background-color',
				);
				(option as HTMLElement).style.removeProperty('opacity');
				(option as HTMLElement).style.setProperty('--inverted', '0');
			}
		}

		(e.currentTarget as HTMLElement).style.setProperty(
			'background-color',
			'var(--selection-color)',
		);
		(e.currentTarget as HTMLElement).style.setProperty(
			'opacity',
			'var(--selection-opacity)',
		);

		(e.currentTarget as HTMLElement).style.setProperty('--inverted', '1');
		// for (const element of (e.currentTarget as HTMLElement).children) {
		// 	if (element.className == 'label') {

		// 	} else if (element.tagName.toLowerCase() == 'ha-icon') {

		// 	}
		// }
	}

	render() {
		super.render();
		console.log(this.entry); // DEBUG

		const entries = this.entry.options ?? [];
		let options =
			(this.hass.states[this.entry.entity_id!].attributes
				.options as string[]) ?? new Array<string>(entries.length);
		if (options.length < entries.length) {
			options = Object.assign(new Array(entries.length), options);
		}

		const backgroundStyle: StyleInfo = {};
		if (this.entry.background_color) {
			backgroundStyle.background = this.setValueInStyleFields(
				this.entry.background_color,
			);
		}
		if (
			this.entry.background_opacity ||
			this.entry.background_opacity == 0
		) {
			backgroundStyle.opacity = this.entry.background_opacity;
		}
		const selector = [
			html`<div
				class="selector-background"
				style=${styleMap(backgroundStyle)}
			></div>`,
		];

		for (const i in entries) {
			const entry = this.entry.options![i];
			if (!('service' in entry)) {
				entry.service = 'input_select.select_option';
				if (!('option' in entry.data!)) {
					entry.data!.option = options[i];
				}
			}

			if (!('opacity' in entry)) {
				entry.opacity = 0;
			}
			const style: StyleInfo = {};
			const option = entry.option ?? options[i];
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
			style['--inverted'] = '0';

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
		if (this.entry.color) {
			style['--selection-color'] = this.entry.color;
		}
		if (this.entry.opacity || this.entry.opacity == 0) {
			style['--selection-opacity'] = this.entry.opacity;
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
