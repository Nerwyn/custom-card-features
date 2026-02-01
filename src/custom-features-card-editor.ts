import { html, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import {
	CardFeatureType,
	HomeAssistant,
	IConfig,
	ICustomFeatureCardConfig,
	IEntry,
} from './models/interfaces';

import './custom-features-row-editor';
import { CustomFeaturesRowEditor } from './custom-features-row-editor';

export class CustomFeaturesCardEditor extends CustomFeaturesRowEditor {
	@property() hass!: HomeAssistant;
	// @ts-expect-error re-using editor code config is different
	@property() config!: ICustomFeatureCardConfig;

	@state() rowIndex: number = -1;

	static get properties() {
		return { hass: {}, config: {} };
	}

	// @ts-expect-error re-using editor code config is different
	configChanged(config: ICustomFeatureCardConfig) {
		super.configChanged(config as unknown as IConfig, false);
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
				<div class="entry-list-header">
					Custom Features Rows<ha-icon-button
						class="header-icon"
						@click=${this.handleREADME}
						><ha-icon .icon="${'mdi:information-outline'}"></ha-icon
					></ha-icon-button>
				</div>
				<ha-sortable
					handle-selector=".handle"
					@item-moved=${handlers.move}
				>
					<div class="features">
						${features.map((row, i) => {
							const entries = row.entries.length
								? row.entries
								: [{ type: 'Empty' as CardFeatureType }];
							return html`
								<div class="feature-list-item">
									<div class="handle">
										<ha-icon
											.icon="${'mdi:drag'}"
										></ha-icon>
									</div>
									${entries.map((entry: IEntry) => {
										const context =
											this.getEntryContext(entry);
										const icon = this.renderTemplate(
											entry.icon as string,
											context,
										);
										const label = this.renderTemplate(
											entry.label as string,
											context,
										);
										const entryType = this.renderTemplate(
											entry.type as string,
											context,
										);
										return html`<div
											class="feature-list-item-content"
										>
											${icon
												? html`<ha-icon
														.icon="${icon}"
													></ha-icon>`
												: ''}
											<div
												class="feature-list-item-label"
											>
												<span class="primary"
													>${entryType ??
													'button'}${label
														? ` ⸱ ${label}`
														: ''}</span
												>
												${context.config.entity
													? html`<span
															class="secondary"
															>${context.config
																.entity_id}${context
																.config
																.attribute
																? ` ⸱ ${context.config.attribute}`
																: ''}</span
														>`
													: ''}
											</div>
										</div>`;
									})}
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
			<ha-button @click=${this.addRow} class="add-list-item">
				<ha-icon .icon=${'mdi:plus'} slot="start"></ha-icon>Add
				row</ha-button
			>
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
				<div class="entry-list-header">Style Options</div>
				<div class="action-options">
					<div class="form">
						${this.buildSelector(
							'Feature height',
							'feature_height',
							{
								number: {
									min: 0,
									step: 1,
									mode: 'box',
									unit_of_measurement: 'px',
								},
							},
							42,
						)}
						${this.buildSelector(
							'Transparent card',
							'transparent',
							{
								boolean: {},
							},
							false,
						)}
					</div>
					${this.buildCodeEditor('jinja2')}
				</div>
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
}
