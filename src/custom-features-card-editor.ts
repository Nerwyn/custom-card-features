import { css, html, LitElement, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import {
	HomeAssistant,
	IConfig,
	ICustomFeatureCardConfig,
} from './models/interfaces';

import './custom-features-row-editor';

export class CustomFeaturesCardEditor extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: ICustomFeatureCardConfig;

	@state() rowIndex: number = -1;

	static get properties() {
		return { hass: {}, config: {} };
	}

	setConfig(config: ICustomFeatureCardConfig) {
		this.config = config;
	}

	configChanged(config: ICustomFeatureCardConfig) {
		const event = new Event('config-changed', {
			bubbles: true,
			composed: true,
		});
		event.detail = { config };
		this.dispatchEvent(event);
		this.requestUpdate();
	}

	rowsChanged(features: IConfig[]) {
		this.configChanged({ ...this.config, features });
	}

	handleRowConfigChanged(e: Event) {
		e.stopPropagation();
		const features = structuredClone(this.config.features);
		features[this.rowIndex] = e.detail.config as IConfig;
		this.rowsChanged(features);
	}

	addRow(_e: Event) {
		const features = structuredClone(this.config.features);
		features.push({ type: 'custom:service-call', entries: [] });
		this.rowsChanged(features);
	}

	moveRow(e: Event) {
		e.stopPropagation();
		const { oldIndex, newIndex } = e.detail;
		const features = structuredClone(this.config.features);
		features.splice(newIndex, 0, features.splice(oldIndex, 1)[0]);
		this.rowsChanged(features);
	}

	copyRow(e: Event) {
		const features = structuredClone(this.config.features);
		const i = (
			e.currentTarget as unknown as Event & Record<'index', number>
		).index;
		const feature = structuredClone(features[i]);
		features.splice(i, 1, features[i], feature);
		this.rowsChanged(features);
	}

	editRow(e: Event) {
		const i = (
			e.currentTarget as unknown as Event & Record<'index', number>
		).index;
		this.rowIndex = i;
	}

	removeRow(e: Event) {
		const i = (
			e.currentTarget as unknown as Event & Record<'index', number>
		).index;
		const features = structuredClone(this.config.features);
		features.splice(i, 1);
		this.rowsChanged(features);
	}

	buildRowsList() {
		const features = this.config?.features ?? [];
		const handlers = {
			move: this.moveRow,
			copy: this.copyRow,
			edit: this.editRow,
			remove: this.removeRow,
		};

		return html`
			<div class="content">
				<div class="feature-list-header">Custom Features Rows</div>
				<ha-sortable
					handle-selector=".handle"
					@item-moved=${handlers.move}
				>
					<div class="features">
						${features.map((row, i) => {
							return html`
								<div class="feature-list-item">
									<div class="handle">
										<ha-icon
											.icon="${'mdi:drag'}"
										></ha-icon>
									</div>
									<div class="feature-list-item-content">
										<div class="feature-list-item-label">
											<span class="primary"
												>${row.entries
													.map(
														(feature) =>
															feature.type ??
															'button',
													)
													.join(' ⸱ ')}</span
											>
										</div>
									</div>
									<ha-icon-button
										class="copy-icon"
										.index=${i}
										@click=${handlers.copy}
									>
										<ha-icon
											.icon="${'mdi:content-copy'}"
										></ha-icon>
									</ha-icon-button>
									<ha-icon-button
										class="edit-icon"
										.index=${i}
										@click=${handlers.edit}
									>
										<ha-icon
											.icon="${'mdi:pencil'}"
										></ha-icon>
									</ha-icon-button>
									<ha-icon-button
										class="remove-icon"
										.index=${i}
										@click=${handlers.remove}
									>
										<ha-icon
											.icon="${'mdi:delete'}"
										></ha-icon>
									</ha-icon-button>
								</div>
							`;
						})}
					</div>
				</ha-sortable>
			</div>
		`;
	}

	buildAddRowButton() {
		return html`
			<ha-button
				@click=${this.addRow}
				outlined
				class="add-list-item"
				.label="${'Add row'}"
			>
				<ha-icon .icon=${'mdi:plus'} slot="icon"></ha-icon>
			</ha-button>
		`;
	}

	handleStyleCodeChanged(e: Event) {
		e.stopPropagation();
		const css = e.detail.value;
		if (css != this.config.styles) {
			this.configChanged({ ...this.config, styles: css });
		}
	}

	buildCodeEditor() {
		return html`
			<div class="yaml-editor">
				CSS Styles
				<ha-code-editor
					mode="jinja2"
					dir="ltr"
					?autocomplete-entities="true"
					?autocomplete-icons="false"
					.hass=${this.hass}
					.value=${this.config.styles ?? ''}
					@value-changed=${this.handleStyleCodeChanged}
					@keydown=${(e: KeyboardEvent) => e.stopPropagation()}
				></ha-code-editor>
			</div>
		`;
	}

	render() {
		if (!this.hass || !this.config) {
			return html``;
		}

		let editor: TemplateResult<1>;
		if (this.rowIndex == -1) {
			editor = html`<div class="content">
				<div>
					<div class="content">${this.buildRowsList()}</div>
					${this.buildAddRowButton()}
				</div>
				${this.buildCodeEditor()}
			</div>`;
		} else {
			editor = html`<custom-features-row-editor
				.hass=${this.hass}
				.config=${this.config.features[this.rowIndex]}
				.showExitButton="${true}"
				@config-changed=${this.handleRowConfigChanged}
			></custom-features-row-editor>`;
		}

		return editor;
	}

	firstUpdated() {
		this.addEventListener('exit-row-editor', () => {
			this.rowIndex = -1;
			this.requestUpdate();
		});
	}

	static get styles() {
		return css`
			:host {
				display: flex;
				flex-direction: column;
				-webkit-tap-highlight-color: transparent;
				-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
			}

			.content {
				padding: 12px;
				display: inline-flex;
				flex-direction: column;
				gap: 24px;
				box-sizing: border-box;
				width: 100%;
			}

			.feature-list-header {
				font-size: 20px;
				font-weight: 500;
			}

			.feature-list-item {
				display: flex;
				align-items: center;
				pointer-events: none;
			}

			.handle {
				display: flex;
				align-items: center;
				cursor: move;
				cursor: grab;
				padding-right: 8px;
				padding-inline-end: 8px;
				padding-inline-start: initial;
				direction: var(--direction);
				pointer-events: all;
			}

			.feature-list-item-content {
				height: 60px;
				font-size: 16px;
				display: flex;
				align-items: center;
				justify-content: flex-start;
				flex-grow: 1;
				gap: 8px;
				overflow: hidden;
			}
			.feature-list-item-label {
				display: flex;
				flex-direction: column;
			}
			.secondary {
				font-size: 12px;
				color: var(--secondary-text-color);
			}

			.copy-icon,
			.edit-icon,
			.remove-icon {
				color: var(--secondary-text-color);
				pointer-events: all;
				--mdc-icon-button-size: 36px;
			}

			ha-icon {
				display: flex;
				color: var(--secondary-text-color);
			}
			.add-list-item {
				margin: 0 18px 12px;
			}
			ha-button {
				width: fit-content;
				--mdc-icon-size: 100%;
			}
		`;
	}
}
