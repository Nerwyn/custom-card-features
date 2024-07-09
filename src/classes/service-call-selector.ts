import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { BaseServiceCallFeature } from './base-service-call-feature';
import './service-call-button';
import styles from '../styles/selector.css' assert { type: 'css' };

@customElement('service-call-selector')
export class ServiceCallSelector extends BaseServiceCallFeature {
	onClick(e: MouseEvent) {
		// Get all selection options
		const options =
			(e.currentTarget as HTMLElement).parentNode?.children ?? [];

		// Set class of all selection options to default
		for (const option of options) {
			if (option.tagName.toLowerCase() == 'service-call-button') {
				option.className = 'option';
			}
		}

		// Set selected option class
		(e.currentTarget as HTMLElement).className = 'selected-option';
	}

	render() {
		this.setValue();

		const selector = [this.buildBackground()];

		const options = this.entry.options ?? [];
		for (const i in options) {
			const optionName = this.renderTemplate(options[i].option as string);
			let optionClass = 'option';
			if (this.value == optionName && this.value != undefined) {
				optionClass = 'selected-option';
			}
			const styleContext = {
				config: {
					...this.entry,
					entity: this.renderTemplate(this.entry.entity_id ?? ''),
					option: optionName,
				},
			};

			selector.push(
				html`<service-call-button
					class=${optionClass}
					.hass=${this.hass}
					.entry=${options[i]}
					.shouldRenderRipple=${false}
					@click=${this.onClick}
					@contextmenu=${this.onContextMenu}
					style=${styleMap(
						this.buildStyle(options[i].style ?? {}, styleContext),
					)}
				/>`,
			);
		}

		return html`${selector}`;
	}

	static styles = [super.styles, styles];
}
