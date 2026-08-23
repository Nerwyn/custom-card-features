import { hasTemplate, renderTemplate } from 'ha-nunjucks';
import { css, html, LitElement, PropertyValues } from 'lit';
import { property, queryAll } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { buildStyles } from './utils/styles';

import './custom-features-card-editor';
import { CustomFeaturesRow } from './custom-features-row';
import { HomeAssistant } from './models/interfaces/HomeAssistant';
import { ICustomFeatureCardConfig } from './models/interfaces/IConfig';

export class CustomFeaturesCard extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: ICustomFeatureCardConfig;
	@queryAll('service-call') rows?: CustomFeaturesRow[];

	featureHeight: number = 42;
	transparent: boolean = false;
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
		return html`<ha-card class=${classMap({ transparent: this.transparent })}
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
		if (changedProperties.has('hass') || changedProperties.has('config')) {
			const styles = this.renderTemplate(
				this.config.styles as string,
			) as string;

			const featureHeight = Number(
				this.renderTemplate((this.config.feature_height ?? 42) as number),
			);

			const transparent =
				String(this.renderTemplate(this.config.transparent as boolean)) ==
				'true';

			const config = JSON.stringify(changedProperties.get('config'));

			if (
				styles != this.styles ||
				featureHeight != this.featureHeight ||
				transparent != this.transparent ||
				config != JSON.stringify(this.config)
			) {
				this.styles = styles;
				this.featureHeight = featureHeight;
				this.style.setProperty('--feature-height', `${this.featureHeight}px`);
				this.transparent = transparent;
				return true;
			}
		}

		// Update child hass objects if not updating
		for (const row of this.rows || []) {
			row.hass = this.hass;
		}

		return false;
	}

	onAttributeEvent(e: Event) {
		e.stopPropagation();
		const attributes = e.detail?.attributes;
		if (
			typeof attributes == 'object' &&
			attributes != null &&
			!Array.isArray(attributes) &&
			Object.keys(attributes).length
		) {
			for (const [key, values] of Object.entries(attributes)) {
				let value = values as string;
				if (Array.isArray(values)) {
					let i = 0;
					if (this.hasAttribute(key)) {
						i = values.findIndex((v) => v == this.getAttribute(key)) + 1;
						if (i >= values.length) {
							i = 0;
						}
					}
					value = values[i];
				}
				if (!value || this.getAttribute(key) == value) {
					this.removeAttribute(key);
				} else {
					this.setAttribute(key, value);
				}
			}
			const event = new Event('cf-attributes');
			event.detail = { attributes };
			for (const child of (this.shadowRoot?.querySelectorAll('service-call') ??
				[]) as LitElement[]) {
				child.dispatchEvent(event);
			}
		}
	}

	firstUpdated() {
		this.addEventListener('cf-attributes', this.onAttributeEvent, true);
	}

	static get styles() {
		return css`
			:host {
				--feature-border-radius: 12px;
				--feature-button-spacing: 12px;
				--feature-color: var(--primary-color);
			}

			ha-card {
				display: flex;
				flex-direction: column;
				padding: 12px 12px 0;
			}

			ha-card.transparent {
				all: unset;
				display: flex;
				flex-direction: column;
			}

			service-call {
				margin-bottom: 12px;
			}
		`;
	}
}
