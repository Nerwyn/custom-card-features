import packageInfo from '../package.json';

import { LitElement, TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { hasTemplate, renderTemplate } from 'ha-nunjucks';
import { HassEntity } from 'home-assistant-js-websocket';
import { HomeAssistant } from './models/interfaces';

import './classes/custom-feature-button';
import './classes/custom-feature-dropdown';
import './classes/custom-feature-selector';
import './classes/custom-feature-slider';
import './classes/custom-feature-spinbox';
import './classes/custom-feature-textbox';
import './classes/custom-feature-toggle';
import { CustomFeaturesRowEditor } from './custom-features-row-editor';
import { IConfig, IEntry } from './models/interfaces';
import { atLeastHaVersion } from './utils';
import { buildStyles } from './utils/styles';

console.info(
	`%c CUSTOM-FEATURES-FOR-TILES-AND-MORE v${packageInfo.version}`,
	'color: white; font-weight: bold; background: cornflowerblue',
);

class CustomFeaturesRow extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: IConfig;
	@property() stateObj!: HassEntity;

	rtl: boolean = false;

	static getConfigElement() {
		return document.createElement('custom-features-row-editor');
	}

	static getStubConfig() {
		return {
			type: 'custom:service-call', // Use old type to not break old configs
			entries: [],
		};
	}

	setConfig(config: IConfig) {
		if (!config) {
			throw new Error('Invalid configuration');
		}
		config = structuredClone(config);

		// Rename buttons to entries
		config.entries = config.entries ?? [];
		if ('buttons' in config) {
			config.entries.push(
				...(config as Record<'buttons', IEntry[]>).buttons,
			);
		}

		this.config = config;
	}

	renderTemplate(
		str: string | number | boolean,
		context?: object,
	): string | number | boolean {
		if (!hasTemplate(str)) {
			return str;
		}

		context = {
			render: (str2: string) => this.renderTemplate(str2, context),
			...context,
		};

		try {
			return renderTemplate(this.hass, str as string, context, false);
		} catch (e) {
			console.error(e);
			return '';
		}
	}

	buildStyles(styles?: string, context?: object) {
		const rendered = this.renderTemplate(
			styles as string,
			context,
		) as string;

		return buildStyles(rendered);
	}

	render() {
		if (!this.config || !this.hass || !this.stateObj) {
			return null;
		}

		this.rtl = getComputedStyle(this).direction == 'rtl';
		if (this.rtl) {
			this.setAttribute('dir', 'rtl');
		}

		const row: TemplateResult[] = [];
		for (const entry of this.config.entries) {
			const context = {
				config: {
					...entry,
					entity: '',
					attribute: '',
					stateObj: this.stateObj,
				},
			};
			context.config.entity = this.renderTemplate(
				entry.entity_id ?? '',
				context,
			) as string;
			context.config.attribute = this.renderTemplate(
				entry.value_attribute ?? 'state',
				context,
			) as string;

			const entryType = (
				(this.renderTemplate(entry.type as string, context) ??
					'button') as string
			).toLowerCase();
			switch (entryType) {
				case 'toggle':
					row.push(
						html`<custom-feature-toggle
							.hass=${this.hass}
							.config=${entry}
							.stateObj=${this.stateObj}
						/>`,
					);
					break;
				case 'textbox':
					row.push(
						html`<custom-feature-textbox
							.hass=${this.hass}
							.config=${entry}
							.stateObj=${this.stateObj}
						/>`,
					);
					break;
				case 'spinbox':
					row.push(
						html`<custom-feature-spinbox
							.hass=${this.hass}
							.config=${entry}
							.stateObj=${this.stateObj}
						/>`,
					);
					break;
				case 'slider':
					row.push(
						html`<custom-feature-slider
							.hass=${this.hass}
							.config=${entry}
							.stateObj=${this.stateObj}
						/>`,
					);
					break;
				case 'selector':
					row.push(
						html`<custom-feature-selector
							.hass=${this.hass}
							.config=${entry}
							.stateObj=${this.stateObj}
						/>`,
					);
					break;
				case 'dropdown':
					row.push(
						html`<custom-feature-dropdown
							.hass=${this.hass}
							.config=${entry}
							.stateObj=${this.stateObj}
						/>`,
					);
					break;
				case 'button':
				default:
					row.push(
						html`<custom-feature-button
							.hass=${this.hass}
							.config=${entry}
							.stateObj=${this.stateObj}
						/>`,
					);
					break;
			}
		}

		const context = {
			config: {
				...this.config,
				entity: this.stateObj.entity_id,
			},
			stateObj: this.stateObj,
		};

		const version = this.hass.config.version;
		return html`<div
				class="row ${classMap({
					'no-padding': atLeastHaVersion(version, 2024, 8),
				})}"
			>
				${row}
			</div>
			${this.buildStyles(this.config.styles, context)}`;
	}

	static get styles() {
		return css`
			:host {
				-webkit-tap-highlight-color: transparent;
				-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
				--mdc-icon-size: 20px;
			}
			.row {
				display: flex;
				flex-flow: row;
				justify-content: center;
				align-items: center;
				padding: 0 12px 12px;
				gap: var(--feature-button-spacing, 12px);
				width: auto;
			}
			.row.no-padding {
				padding: 0;
			}
		`;
	}
}

if (!window.structuredClone) {
	window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}
if (!window.performance) {
	window.performance = window.Date as unknown as Performance;
}

customElements.define('custom-features-row-editor', CustomFeaturesRowEditor);
customElements.define('service-call', CustomFeaturesRow); // Original name to not break old configs
window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
	type: 'service-call',
	name: 'Custom features row',
	configurable: true,
});
