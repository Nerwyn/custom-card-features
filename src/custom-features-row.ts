import packageInfo from '../package.json';

import { LitElement, TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { hasTemplate, renderTemplate } from 'ha-nunjucks';
import { HassEntity } from 'home-assistant-js-websocket';
import { CardFeatureType, HomeAssistant } from './models/interfaces';

import './classes/custom-feature-dropdown';
import './classes/custom-feature-input';
import './classes/custom-feature-selector';
import './classes/custom-feature-slider';
import './classes/custom-feature-spinbox';
import './classes/custom-feature-toggle';
import { CustomFeaturesCard } from './custom-features-card';
import { CustomFeaturesCardEditor } from './custom-features-card-editor';
import { CustomFeaturesRowEditor } from './custom-features-row-editor';
import { IConfig, IEntry } from './models/interfaces';
import { atLeastHaVersion } from './utils';
import { buildStyles } from './utils/styles';

console.info(
	`%c CUSTOM-CARD-FEATURES-FOR-TILES-AND-MORE v${packageInfo.version}`,
	'color: white; font-weight: bold; background: cornflowerblue',
);

class CustomFeaturesRow extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: IConfig;
	@property() context?: Record<'entity_id' | 'area_id', string>;
	@property() stateObj?: HassEntity & Record<'area_id', string>;

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
		if (!this.config || !this.hass) {
			return null;
		}

		this.stateObj = {
			...this.stateObj,
			area_id: this.context?.area_id,
		} as HassEntity & Record<'area_id', string>;

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

			const entryType = String(
				this.renderTemplate(entry.type as string, context) ?? 'button',
			).toLowerCase() as CardFeatureType;
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
				case 'input':
					row.push(
						html`<custom-feature-input
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
			config: { ...this.config, entity: this.stateObj?.entity_id },
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
				--md-sys-motion-expressive-spatial-fast: 350ms
					cubic-bezier(0.42, 1.67, 0.21, 0.9);
				--md-sys-motion-expressive-spatial-default: 500ms
					cubic-bezier(0.38, 1.21, 0.22, 1);
				--md-sys-motion-expressive-effects-fast: 150ms
					cubic-bezier(0.31, 0.94, 0.34, 1);
				--md-sys-motion-expressive-effects-default: 200ms
					cubic-bezier(0.34, 0.8, 0.34, 1);
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

customElements.define('custom-features-row-editor', CustomFeaturesRowEditor);
customElements.define('service-call', CustomFeaturesRow); // Original name to not break old configs
window.customCardFeatures ||= [];
window.customCardFeatures.push({
	type: 'service-call',
	name: 'Custom features row',
	configurable: true,
});

customElements.define('custom-features-card-editor', CustomFeaturesCardEditor);
customElements.define('custom-features-card', CustomFeaturesCard);
window.customCards ||= [];
window.customCards.push({
	type: 'custom-features-card',
	name: 'Custom features card',
	description: 'Headless container/stack for custom features rows.',
});

if (!window.structuredClone) {
	window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}
if (!window.performance) {
	window.performance = window.Date as unknown as Performance;
}
