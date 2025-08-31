import { hasTemplate, renderTemplate } from 'ha-nunjucks';
import { css, html, LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { HomeAssistant, ICustomFeatureCardConfig } from './models/interfaces';
import { buildStyles } from './utils/styles';

import './custom-features-card-editor';
import { CustomFeaturesRow } from './custom-features-row';

export class CustomFeaturesCard extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: ICustomFeatureCardConfig;

	styles: string = '';

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
			${buildStyles(this.styles)}`;
	}

	shouldUpdate(changedProperties: PropertyValues) {
		if (changedProperties.has('hass')) {
			const styles = this.renderTemplate(
				this.config.styles as string,
			) as string;

			if (styles != this.styles) {
				this.styles = styles;
				return true;
			}
		}

		if (changedProperties.has('config')) {
			return (
				JSON.stringify(this.config) !=
				JSON.stringify(changedProperties.get('config'))
			);
		}

		// Update child hass objects if not updating
		const children =
			this.shadowRoot?.querySelectorAll('service-call') ?? [];
		for (const child of children) {
			(child as CustomFeaturesRow).hass = this.hass;
		}

		return false;
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
