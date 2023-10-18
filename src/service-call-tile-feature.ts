import { version } from '../package.json';

import { LitElement, TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

import { IConfig, IEntry } from './models/interfaces';
import './classes/service-call-button';
import './classes/service-call-slider';

console.info(
	`%c SERVICE-CALL-TILE-FEATURE v${version}`,
	'color: white; font-weight: bold; background: cornflowerblue',
);

class ServiceCallTileFeature extends LitElement {
	@property({ attribute: false }) hass!: HomeAssistant;
	@property({ attribute: false }) private config!: IConfig;
	@property({ attribute: false }) private stateObj!: HassEntity;

	constructor() {
		super();
	}

	static getStubConfig() {
		return {
			type: 'custom:service-call',
			entries: [
				{
					type: 'button',
					service: '',
				},
			],
		};
	}

	setConfig(config: IConfig) {
		if (!config) {
			throw new Error('Invalid configuration');
		}
		config = JSON.parse(JSON.stringify(config));

		// Rename buttons to entries
		if ('buttons' in config && !('entries' in config)) {
			(config as IConfig).entries = (
				config as Record<'buttons', IEntry[]>
			).buttons as IEntry[];
		}
		for (const entry of config.entries) {
			// Merge target and data fields
			entry.data = {
				...(entry.data || {}),
				...(entry.target || {}),
			};

			// Set entry type to button if not present
			if (!('type' in entry)) {
				(entry as IEntry).type = 'button';
			}
		}

		this.config = config;
	}

	render() {
		if (!this.config || !this.hass || !this.stateObj) {
			return null;
		}

		const entries: TemplateResult[] = [];
		for (const [itemid, entry] of this.config.entries.entries()) {
			// Set entity ID to tile card entity ID if no other ID is present
			if (
				!('entity_id' in entry.data!) &&
				!('device_id' in entry.data!) &&
				!('area_id' in entry.data!)
			) {
				entry.data!['entity_id'] = this.stateObj.entity_id;
			}

			const entryType = entry.type;
			switch (entryType.toLowerCase()) {
				case 'slider':
					entries.push(
						html`<service-call-slider
							.hass=${this.hass}
							.entry${entry}
							.itemid=${itemid}
						/>`,
					);
					break;
				case 'button':
				default:
					entries.push(
						html`<service-call-button
							.hass=${this.hass}
							.entry=${entry}
							.itemid=${itemid}
						/>`,
					);
					break;
			}
		}

		return html`<div class="row">${entries}</div>`;
	}

	static get styles() {
		return css`
			.row {
				display: flex;
				flex-direction: row;
				flex-flow: row;
				justify-content: center;
				align-items: center;
				padding: 0 12px 12px;
				gap: 12px;
				width: auto;
			}
		`;
	}
}

customElements.define('service-call', ServiceCallTileFeature);

window.customTileFeatures = window.customTileFeatures || [];
window.customTileFeatures.push({
	type: 'service-call',
	name: 'Service Call',
	configurable: true,
});
