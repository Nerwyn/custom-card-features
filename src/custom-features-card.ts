import { hasTemplate, renderTemplate } from 'ha-nunjucks';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { HomeAssistant, ICustomFeatureCardConfig } from './models/interfaces';
import { buildStyles } from './utils/styles';

import './custom-features-card-editor';

export class CustomFeaturesCard extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: ICustomFeatureCardConfig;

	static getConfigElement() {
		return document.createElement('custom-features-card-editor');
	}

	static getStubConfig() {
		return {
			type: 'custom:custom-features-card',
			features: [],
		};
	}

	getCardSize() {
		return this.config.features.length || 0;
	}

	setConfig(config: ICustomFeatureCardConfig) {
		if (!config) {
			throw new Error('Invalid configuration');
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
			config: this.config,
			...context,
		};
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
		return html`<ha-card
				>${this.config.features.map(
					(row) =>
						html`<service-call
							.hass=${this.hass}
							.config=${row}
						></service-call>`,
				)}</ha-card
			>
			${this.buildStyles(this.config.styles)}`;
	}

	static get styles() {
		return css`
			:host {
				--feature-height: 42px;
				--feature-border-radius: 12px;
				--feature-button-spacing: 12px;
				--feature-color: var(--primary-color);
			}

			ha-card {
				display: flex;
				flex-direction: column;
				padding: 12px 12px 0;
			}

			service-call {
				margin-bottom: 12px;
			}
		`;
	}
}
