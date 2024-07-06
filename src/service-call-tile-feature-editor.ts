import { LitElement, TemplateResult, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { StyleInfo } from 'lit/directives/style-map.js';
import { renderTemplate } from 'ha-nunjucks';

import { HomeAssistant } from 'custom-card-helpers';
import { dump, load } from 'js-yaml';

import {
	IConfig,
	IEntry,
	IOption,
	TileFeatureTypes,
	Actions,
	ThumbTypes,
} from './models/interfaces';

export class ServiceCallTileFeatureEditor extends LitElement {
	@property() hass!: HomeAssistant;
	@property() config!: IConfig;
	@property() context!: Record<'entity_id', string>;

	@state() entryEditorIndex: number = -1;
	@state() actionsTabIndex: number = 0;
	@state() styleTabIndex: number = 0;
	@state() optionEditorIndex: number = -1;
	@state() spinboxTabIndex: number = 1;

	@state() guiMode: boolean = true;
	@state() errors?: string[];

	yamlString?: string;
	yamlKey?: string;
	styleFields: string[] = [];

	activeEntry?: IEntry | IOption;
	activeEntryType: 'entry' | 'option' | 'decrement' | 'increment' = 'entry';

	static get properties() {
		return { hass: {}, config: {} };
	}

	setConfig(config: IConfig) {
		this.config = config;
	}

	configChanged(config: IConfig) {
		const event = new Event('config-changed', {
			bubbles: true,
			composed: true,
		});
		event.detail = {
			config: {
				...this.config,
				...config,
			},
		};
		this.dispatchEvent(event);
		this.requestUpdate();
	}

	entriesChanged(entries: IEntry[]) {
		this.configChanged({
			entries: entries,
		} as IConfig);
	}

	entryChanged(entry: IEntry) {
		const entries = structuredClone(this.config.entries);
		const oldEntry = entries[this.entryEditorIndex];
		let updatedEntry: IEntry | IOption;
		switch (this.activeEntryType) {
			case 'option': {
				const options = oldEntry.options ?? [];
				const oldOption = options[this.optionEditorIndex];
				options[this.optionEditorIndex] = {
					...oldOption,
					...entry,
				};
				updatedEntry = {
					...oldEntry,
					options: options,
				};
				break;
			}
			case 'decrement':
				updatedEntry = {
					...oldEntry,
					decrement: {
						...oldEntry.decrement,
						...entry,
					},
				};
				break;
			case 'increment':
				updatedEntry = {
					...oldEntry,
					increment: {
						...oldEntry.increment,
						...entry,
					},
				};
				break;
			case 'entry':
			default:
				updatedEntry = {
					...oldEntry,
					...entry,
				};
		}
		entries[this.entryEditorIndex] = updatedEntry;
		this.entriesChanged(entries);
	}

	moveEntry(e: CustomEvent) {
		e.stopPropagation();
		const { oldIndex, newIndex } = e.detail;
		const entries = structuredClone(this.config.entries);
		entries.splice(newIndex, 0, entries.splice(oldIndex, 1)[0]);
		this.entriesChanged(entries);
	}

	moveOption(e: CustomEvent) {
		e.stopPropagation();
		const { oldIndex, newIndex } = e.detail;
		const entry = structuredClone(this.activeEntry) as IOption;
		const options = entry.options ?? [];
		options.splice(newIndex, 0, options.splice(oldIndex, 1)[0]);
		entry.options = options;
		this.entryChanged(entry);
	}

	editEntry(e: CustomEvent) {
		this.yamlString = undefined;
		const i = (
			e.currentTarget as unknown as CustomEvent & Record<'index', number>
		).index;
		this.styleTabIndex = 0;
		this.actionsTabIndex = 0;
		this.optionEditorIndex = -1;
		this.spinboxTabIndex = 1;
		this.entryEditorIndex = i;
	}

	editOption(e: CustomEvent) {
		this.yamlString = undefined;
		const i = (
			e.currentTarget as unknown as CustomEvent & Record<'index', number>
		).index;
		this.styleTabIndex = 0;
		this.actionsTabIndex = 0;
		this.optionEditorIndex = i;
	}

	removeEntry(e: CustomEvent) {
		const i = (
			e.currentTarget as unknown as CustomEvent & Record<'index', number>
		).index;
		const entries = structuredClone(this.config.entries);
		entries.splice(i, 1);
		this.entriesChanged(entries);
	}

	removeOption(e: CustomEvent) {
		const i = (
			e.currentTarget as unknown as CustomEvent & Record<'index', number>
		).index;
		const entry = structuredClone(this.activeEntry) as IOption;
		const options = entry.options ?? [];
		options.splice(i, 1);
		entry.options = options;
		this.entryChanged(entry);
	}

	addEntry(e: CustomEvent) {
		const i = e.detail.index as number;
		const entries = structuredClone(this.config.entries);
		entries.push({
			type: TileFeatureTypes[i],
		});
		this.entriesChanged(entries);
	}

	addOption(_e: CustomEvent) {
		const entry = structuredClone(this.activeEntry) as IOption;
		const options = entry.options ?? [];
		options.push({});
		entry.options = options;
		this.entryChanged(entry);
	}

	exitEditEntry(_e: CustomEvent) {
		this.yamlString = undefined;
		this.entryEditorIndex = -1;
	}

	exitEditOption(_e: CustomEvent) {
		this.yamlString = undefined;
		this.optionEditorIndex = -1;
	}

	toggleGuiMode(_e: CustomEvent) {
		this.yamlString = undefined;
		this.guiMode = !this.guiMode;
	}

	get yaml(): string {
		if (this.yamlString == undefined) {
			let yamlObj;
			switch (this.yamlKey) {
				case 'root':
					yamlObj = this.config.style ?? {};
					break;
				case 'entry':
					yamlObj = this.config.entries[this.entryEditorIndex];
					break;
				default:
					yamlObj = this.activeEntry?.[
						this.yamlKey as keyof IEntry
					] as StyleInfo;
					break;
			}
			const yaml = dump(yamlObj);
			this.yamlString = yaml.trim() == '{}' ? '' : yaml;
		}
		return this.yamlString || '';
	}

	set yaml(yaml: string | undefined) {
		this.yamlString = yaml;
		try {
			let updatedField: IConfig | IEntry[] | IEntry;
			switch (this.yamlKey) {
				case 'root':
					updatedField = {
						style: load(this.yaml),
					} as IConfig;
					this.configChanged(updatedField);
					break;
				case 'entry':
					updatedField = structuredClone(this.config.entries);
					updatedField[this.entryEditorIndex] = load(
						this.yaml,
					) as IEntry;
					this.entriesChanged(updatedField);
					break;
				default:
					updatedField = {
						[this.yamlKey as keyof IEntry]: load(
							this.yaml,
						) as StyleInfo,
					};
					this.entryChanged(updatedField);
					break;
			}
			this.errors = undefined;
		} catch (e) {
			this.errors = [(e as Error).message];
		}
	}

	handleYamlChanged(e: CustomEvent) {
		e.stopPropagation();
		const yaml = e.detail.value;
		if (yaml != this.yaml) {
			this.yaml = yaml;
		}
	}

	handleSpinboxTabSelected(e: CustomEvent) {
		this.yamlString = undefined;
		const i = e.detail.value;
		if (this.spinboxTabIndex == i) {
			return;
		}
		this.spinboxTabIndex = i;
	}

	handleActionsTabSelected(e: CustomEvent) {
		const i = e.detail.value;
		if (this.actionsTabIndex == i) {
			return;
		}
		this.actionsTabIndex = i;
	}

	handleStyleTabSelected(e: CustomEvent) {
		this.yamlString = undefined;
		const i = e.detail.value;
		if (this.styleTabIndex == i) {
			return;
		}
		this.yamlKey = this.styleFields[i];
		this.styleTabIndex = i;
	}

	handleSelectorChange(e: CustomEvent) {
		const key = (e.target as HTMLElement).id;
		const value = e.detail.value;
		if (key.startsWith('range.')) {
			const index = parseInt(key.split('.')[1]);
			const range = (structuredClone(this.activeEntry?.range) as [
				number,
				number,
			]) ?? [0, 100];
			if (value != undefined) {
				range[index] = value;
			} else {
				if (index == 0) {
					range[index] = 0; // TODO use domain defaults
				} else {
					range[index] = 100; // TODO use domain defaults
				}
			}
			this.entryChanged({
				range: range,
			});
		} else {
			this.entryChanged({
				[key]: value,
			});
		}
	}

	buildEntryList(field: 'entry' | 'option' = 'entry') {
		let entries: IEntry[] | IOption[];
		let handlers: Record<string, (e: CustomEvent) => void>;
		let backupType: string;
		switch (field) {
			case 'option':
				entries = this.activeEntry?.options ?? [];
				handlers = {
					move: this.moveOption,
					edit: this.editOption,
					remove: this.removeOption,
				};
				backupType = 'Option';
				break;
			case 'entry':
			default:
				entries = this.config.entries;
				handlers = {
					move: this.moveEntry,
					edit: this.editEntry,
					remove: this.removeEntry,
				};
				backupType = 'Button';
				break;
		}
		return html`
			<div class="content">
				<ha-sortable
					handle-selector=".handle"
					@item-moved=${handlers.move}
				>
					<div class="features">
						${entries.map((entry, i) => {
							const context = {
								VALUE: 0,
								HOLD_SECS: 0,
								UNIT: '',
								value: 0,
								hold_secs: 0,
								unit: '',
								config: {
									...entry,
									entity: '',
									attribute: '',
								},
							};
							context.config.attribute = this.renderTemplate(
								entry.value_attribute as string,
								context,
							) as string;
							context.config.entity = this.renderTemplate(
								entry.entity_id as string,
								context,
							) as string;
							const unit = this.renderTemplate(
								entry.unit_of_measurement as string,
								context,
							) as string;
							(context.UNIT = unit), (context.unit = unit);
							const value = this.getFeatureValue(
								context.config.entity,
								context.config.attribute,
							);
							context.VALUE = value;
							context.value = value;

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
							return html`
								<div class="feature">
									<div class="handle">
										<ha-icon
											.icon="${'mdi:drag'}"
										></ha-icon>
									</div>
									<div class="feature-content">
										${icon
											? html`<ha-icon
													.icon="${icon}"
											  ></ha-icon>`
											: ''}
										<div>
											<span
												>${entryType ??
												backupType}${label
													? ` ⸱ ${label}`
													: ''}</span
											>
											${context.config.entity
												? html`<span class="secondary"
														>${context.config
															.entity_id}${context
															.config.attribute
															? ` ⸱ ${context.config.attribute}`
															: ''}<
														/span></span
												  >`
												: ''}
										</div>
									</div>
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

	buildAddEntryButton() {
		return html`
			<ha-button-menu
				fixed
				@action=${this.addEntry}
				@closed=${(e: CustomEvent) => e.stopPropagation()}
			>
				<ha-button
					slot="trigger"
					outlined
					.label="${'ADD CUSTOM FEATURE'}"
				>
					<ha-icon .icon=${'mdi:plus'} slot="icon"></ha-icon>
				</ha-button>
				${TileFeatureTypes.map(
					(tileFeatureType) => html`
						<ha-list-item .value=${tileFeatureType}>
							${tileFeatureType}
						</ha-list-item>
					`,
				)}
			</ha-button-menu>
		`;
	}

	buildAddOptionButton() {
		return html`
			<ha-button
				slot="trigger"
				outlined
				.label="${'ADD OPTION'}"
				@click=${this.addOption}
			>
				<ha-icon .icon=${'mdi:plus'} slot="icon"></ha-icon>
			</ha-button>
		`;
	}

	buildEntryHeader(field: 'entry' | 'option' = 'entry') {
		let title: string;
		let exitHandler: (e: CustomEvent) => void;
		switch (field) {
			case 'option':
				title = 'Selector Option';
				exitHandler = this.exitEditOption;
				break;
			case 'entry':
			default:
				title =
					this.config.entries[this.entryEditorIndex].type ?? 'Button';
				exitHandler = this.exitEditEntry;
				break;
		}
		return html`
			<div class="header">
				<div class="back-title">
					<ha-icon-button-prev
						.label=${this.hass.localize('ui.common.back')}
						@click=${exitHandler}
					></ha-icon-button-prev>
					<span slot="title"> ${title} </span>
				</div>
				${field == 'entry'
					? html`<ha-icon-button
							class="gui-mode-button"
							@click=${this.toggleGuiMode}
							.label=${this.hass.localize(
								this.guiMode
									? 'ui.panel.lovelace.editor.edit_card.show_code_editor'
									: 'ui.panel.lovelace.editor.edit_card.show_visual_editor',
							)}
					  >
							<ha-icon
								.icon="${this.guiMode
									? 'mdi:code-braces'
									: 'mdi:list-box-outline'}"
							></ha-icon>
					  </ha-icon-button>`
					: ''}
			</div>
		`;
	}

	buildStyleEditor(fields: Record<string, string>) {
		this.yamlKey = ['style'].concat(Object.keys(fields))[
			this.styleTabIndex
		] as keyof IEntry;
		this.styleFields = ['style'].concat(Object.keys(fields));
		return html`
			<div>
				<div class="style-header">CSS Styles</div>
				<paper-tabs
					scrollable
					hide-scroll-buttons
					.selected=${this.styleTabIndex}
					@selected-changed=${this.handleStyleTabSelected}
				>
					<paper-tab>Outer</paper-tab>
					${Object.keys(fields).map(
						(field) =>
							html`<paper-tab>${fields[field]}</paper-tab>`,
					)}
				</paper-tabs>
				${this.buildYamlEditor()}
			</div>
		`;
	}

	buildSelector(
		label: string,
		key: keyof IEntry,
		selector: object,
		backupValue: string | number | boolean | object = '',
	) {
		const hass: HomeAssistant = {
			...this.hass,
			localize: (key, values) => {
				const value = {
					'ui.panel.lovelace.editor.action-editor.actions.repeat':
						'Repeat',
					'ui.panel.lovelace.editor.action-editor.actions.fire-dom-event':
						'Fire DOM Event',
				}[key];
				return value ?? this.hass.localize(key, values);
			},
		};

		let value;
		if (key.startsWith('range.')) {
			const index = parseInt(key.split('.')[1]);
			value = this.activeEntry?.range?.[index];
		} else {
			value = this.activeEntry?.[key];
		}

		return html`<ha-selector
			.hass=${hass}
			.selector=${selector}
			.value=${value ?? backupValue}
			.label="${label}"
			.name="${label}"
			.required=${false}
			id="${key}"
			@value-changed=${this.handleSelectorChange}
		></ha-selector>`;
	}

	buildMainFeatureOptions(
		additionalOptions: TemplateResult<1> = html``,
		additionalFormOptions: TemplateResult<1> = html``,
	) {
		return html`
			${this.buildSelector('Entity', 'entity_id', {
				entity: {},
			})}
			${
				this.activeEntry?.entity_id
					? this.buildSelector('Attribute', 'value_attribute', {
							attribute: {
								entity_id: this.activeEntry.entity_id,
							},
					  })
					: ''
			}
			${additionalOptions}
			<div class="form">
				${additionalFormOptions}
				${this.buildSelector(
					'Autofill Entity',
					'autofill_entity_id',
					{
						boolean: {},
					},
					true,
				)}
				${this.buildSelector(
					'Haptics',
					'haptics',
					{
						boolean: {},
					},
					false,
				)}
			</div>
		</div> `;
	}

	buildAppearancePanel(appearanceOptions: TemplateResult<1> = html``) {
		return html`
			<ha-expansion-panel .header=${'Appearance'}>
				<div
					class="panel-header"
					slot="header"
					role="heading"
					aria-level="3"
				>
					<ha-icon .icon=${'mdi:palette'}></ha-icon>
					Appearance
				</div>
				<div class="content">${appearanceOptions}</div>
			</ha-expansion-panel>
		`;
	}

	buildCommonAppearanceOptions() {
		return html`${this.buildSelector('Label', 'label', {
				text: { multiline: true },
			})}
			<div class="form">
				${this.buildSelector('Icon', 'icon', {
					icon: {},
				})}${this.buildSelector('Units', 'unit_of_measurement', {
					text: {},
				})}
			</div>`;
	}

	buildActionsPanel(actionSelectors: TemplateResult<1>) {
		// TODO - set target entity ID to feature entity ID when autofill is set to true.
		return html`
			<ha-expansion-panel .header=${'Actions'}>
				<div
					class="panel-header"
					slot="header"
					role="heading"
					aria-level="3"
				>
					<ha-icon .icon=${'mdi:gesture-tap'}></ha-icon>
					Actions
				</div>
				<div class="content">${actionSelectors}</div>
			</ha-expansion-panel>
		`;
	}

	buildButtonGuiEditor() {
		const actionsTabBar = html`
			<paper-tabs
				scrollable
				hide-scroll-buttons
				.selected=${this.actionsTabIndex}
				@selected-changed=${this.handleActionsTabSelected}
			>
				<paper-tab>Default</paper-tab>
				<paper-tab>Momentary</paper-tab>
			</paper-tabs>
		`;
		let actionSelectors: TemplateResult<1>;
		const actionsNoRepeat = Actions.concat();
		actionsNoRepeat.splice(Actions.indexOf('repeat'), 1);
		const defaultUiActions = {
			ui_action: {
				actions: actionsNoRepeat,
				default_action: 'none',
			},
		};
		switch (this.actionsTabIndex) {
			case 1:
				actionSelectors = html`
					${actionsTabBar}
					${this.buildSelector(
						'Start action (optional)',
						'momentary_start_action',
						defaultUiActions,
					)}
					${this.buildSelector(
						'End action (optional)',
						'momentary_end_action',
						defaultUiActions,
					)}
				`;
				break;
			case 0:
			default:
				actionSelectors = html`
					${actionsTabBar}
					${this.buildSelector(
						'Tap action (optional)',
						'tap_action',
						defaultUiActions,
					)}
					${this.buildSelector(
						'Double tap action (optional)',
						'double_tap_action',
						defaultUiActions,
					)}
					${this.buildSelector(
						'Hold action (optional)',
						'hold_action',
						{
							ui_action: {
								actions: Actions,
								default_action: 'none',
							},
						},
					)}
				`;
				break;
		}

		return html`
			${this.buildMainFeatureOptions()}
			${this.buildAppearancePanel(html`
				${this.buildCommonAppearanceOptions()}
				${this.buildStyleEditor({
					background_style: 'Background',
					icon_style: 'Icon',
					label_style: 'Label',
				})}
			`)}
			${this.buildActionsPanel(actionSelectors)}
		`;
	}

	buildSliderGuiEditor() {
		const actionsNoRepeat = Actions.concat();
		actionsNoRepeat.splice(Actions.indexOf('repeat'), 1);

		return html`
			${this.buildMainFeatureOptions(
				undefined,
				html`
					${this.buildSelector(
						'Min',
						'range.0' as keyof IEntry,
						{
							number: {
								max: this.activeEntry?.range?.[1], // TODO use domain defaults
								step: this.activeEntry?.step ?? 1,
								mode: 'box',
								unit_of_measurement:
									this.activeEntry?.unit_of_measurement,
							},
						},
						0,
					)}
					${this.buildSelector(
						'Max',
						'range.1' as keyof IEntry,
						{
							number: {
								min: this.activeEntry?.range?.[0], // TODO use domain defaults
								step: this.activeEntry?.step ?? 1,
								mode: 'box',
								unit_of_measurement:
									this.activeEntry?.unit_of_measurement,
							},
						},
						100,
					)}
					${this.buildSelector(
						'Step',
						'step',
						{
							number: {
								min: 0, // TODO use domain defaults
								step: Math.min(
									1,
									((this.activeEntry?.range?.[1] ?? 1) -
										(this.activeEntry?.range?.[0] ?? 0)) /
										100,
								),
								mode: 'box',
								unit_of_measurement:
									this.activeEntry?.unit_of_measurement,
							},
						},
						1,
					)}
					${this.buildSelector(
						'Update After Action Delay',
						'value_from_hass_delay',
						{
							number: {
								min: 0,
								step: 0,
								mode: 'box',
								unit_of_measurement: 'ms',
							},
						},
						1000,
					)}
				`,
			)}
			${this.buildAppearancePanel(html`
				${this.buildCommonAppearanceOptions()}
				${this.buildSelector(
					'Thumb Type',
					'thumb',
					{
						select: {
							mode: 'dropdown',
							options: ThumbTypes,
							reorder: false,
						},
					},
					'default',
				)}
				${this.buildStyleEditor({
					background_style: 'Background',
					icon_style: 'Icon',
					label_style: 'Label',
					slider_style: 'Slider',
					tooltip_style: 'Tooltip',
				})}
			`)}
			${this.buildActionsPanel(
				this.buildSelector('Action', 'tap_action', {
					ui_action: {
						actions: actionsNoRepeat,
						default_action: 'call-service',
					},
				}),
			)}
		`;
	}

	buildSelectorGuiEditor() {
		let selectorGuiEditor: TemplateResult<1>;
		switch (this.optionEditorIndex) {
			case -1:
				selectorGuiEditor = html`${this.buildMainFeatureOptions()}
				${this.buildEntryList('option')}${this.buildAddOptionButton()}
				${this.buildStyleEditor({ background_style: 'Background' })}`;
				break;
			default:
				this.activeEntry =
					this.config.entries[this.entryEditorIndex].options?.[
						this.optionEditorIndex
					];
				this.activeEntryType = 'option';
				selectorGuiEditor = html`
					${this.buildEntryHeader('option')}
					${this.buildSelector('Option', 'option' as keyof IEntry, {
						text: {},
					})}
					${this.buildButtonGuiEditor()}
				`;
				break;
		}

		return selectorGuiEditor;
	}

	buildSpinboxGuiEditor() {
		const actionsNoRepeat = Actions.concat();
		actionsNoRepeat.splice(Actions.indexOf('repeat'), 1);
		const defaultTapActions = {
			ui_action: {
				actions: actionsNoRepeat,
				default_action: 'call-service',
			},
		};
		const defaultHoldActions = {
			ui_action: {
				actions: ['repeat', 'none'],
				default_action: 'none',
			},
		};
		const actionSelectors = html`
			${this.buildSelector('Tap action', 'tap_action', defaultTapActions)}
			${this.buildSelector(
				'Hold action (optional)',
				'hold_action',
				defaultHoldActions,
			)}
		`;
		const spinboxTabBar = html`
			<paper-tabs
				scrollable
				hide-scroll-buttons
				.selected=${this.spinboxTabIndex}
				@selected-changed=${this.handleSpinboxTabSelected}
			>
				<paper-tab>Decrement</paper-tab>
				<paper-tab>Center</paper-tab>
				<paper-tab>Increment</paper-tab>
			</paper-tabs>
		`;

		let spinboxGuiEditor: TemplateResult<1>;
		switch (this.spinboxTabIndex) {
			case 0:
				this.activeEntry =
					this.config.entries[this.entryEditorIndex].decrement;
				this.activeEntryType = 'decrement';
				spinboxGuiEditor = this.buildButtonGuiEditor();
				break;
			case 2:
				this.activeEntry =
					this.config.entries[this.entryEditorIndex].increment;
				this.activeEntryType = 'increment';
				spinboxGuiEditor = this.buildButtonGuiEditor();
				break;
			case 1:
			default:
				spinboxGuiEditor = html`
					${this.buildMainFeatureOptions(
						this.buildSelector(
							'Step',
							'step',
							{
								number: {
									min: 0, // TODO use domain defaults
									step: Math.min(
										1,
										((this.activeEntry?.range?.[1] ?? 1) -
											(this.activeEntry?.range?.[0] ??
												0)) /
											100,
									),
									mode: 'box',
									unit_of_measurement:
										this.activeEntry?.unit_of_measurement,
								},
							},
							1,
						),
						html`
							${this.buildSelector(
								'Min',
								'range.0' as keyof IEntry,
								{
									number: {
										max: this.activeEntry?.range?.[1], // TODO use domain defaults
										step: this.activeEntry?.step ?? 1,
										mode: 'box',
										unit_of_measurement:
											this.activeEntry
												?.unit_of_measurement,
									},
								},
								0,
							)}
							${this.buildSelector(
								'Max',
								'range.1' as keyof IEntry,
								{
									number: {
										min: this.activeEntry?.range?.[0], // TODO use domain defaults
										step: this.activeEntry?.step ?? 1,
										mode: 'box',
										unit_of_measurement:
											this.activeEntry
												?.unit_of_measurement,
									},
								},
								100,
							)}
							${this.buildSelector(
								'Update After Action Delay',
								'value_from_hass_delay',
								{
									number: {
										min: 0,
										step: 1,
										mode: 'box',
										unit_of_measurement: 'ms',
									},
								},
								1000,
							)}
							${this.buildSelector(
								'Debounce Time',
								'debounce_time',
								{
									number: {
										min: 0,
										step: 1,
										mode: 'box',
										unit_of_measurement: 'ms',
									},
								},
								1000,
							)}
						`,
					)}
					${this.buildAppearancePanel(
						html`${this.buildCommonAppearanceOptions()}
						${this.buildStyleEditor({
							background_style: 'Background',
							icon_style: 'Icon',
							label_style: 'Label',
						})}`,
					)}
					${this.buildActionsPanel(actionSelectors)}
				`;
				break;
		}

		return html`${spinboxTabBar}${spinboxGuiEditor}`;
	}

	buildEntryGuiEditor() {
		this.activeEntry = this.config.entries[this.entryEditorIndex];
		this.activeEntryType = 'entry';
		let entryGuiEditor: TemplateResult<1>;
		switch (this.activeEntry.type) {
			case 'slider':
				entryGuiEditor = this.buildSliderGuiEditor();
				break;
			case 'selector':
				entryGuiEditor = this.buildSelectorGuiEditor();
				break;
			case 'spinbox':
				entryGuiEditor = this.buildSpinboxGuiEditor();
				break;
			case 'button':
			default:
				entryGuiEditor = this.buildButtonGuiEditor();
				break;
		}
		return html`<div class="gui-editor">${entryGuiEditor}</div> `;
	}

	buildYamlEditor() {
		return html`
			<div class="yaml-editor">
				<ha-code-editor
					mode="yaml"
					autofocus
					autocomplete-entities
					autocomplete-icons
					.hass=${this.hass}
					.value=${this.yaml}
					.error=${Boolean(this.errors)}
					@value-changed=${this.handleYamlChanged}
					@keydown=${(e: CustomEvent) => e.stopPropagation()}
					dir="ltr"
				></ha-code-editor>
			</div>
		`;
	}

	buildEntryEditor() {
		let editor: TemplateResult<1>;
		if (this.guiMode) {
			editor = this.buildEntryGuiEditor();
		} else {
			this.yamlString = undefined;
			this.yamlKey = 'entry';
			editor = this.buildYamlEditor();
		}

		return html`
			${this.buildEntryHeader()}
			<div class="wrapper">${editor}</div>
		`;
	}

	buildErrorPanel() {
		return html`
			${this.errors && this.errors.length > 0
				? html`<div class="error">
						${this.hass.localize(
							'ui.errors.config.error_detected',
						)}:
						<br />
						<ul>
							${this.errors!.map(
								(error) => html`<li>${error}</li>`,
							)}
						</ul>
				  </div>`
				: ''}
		`;
	}

	render() {
		if (!this.hass) {
			return html``;
		}

		const entries: IEntry[] = [];
		let updateEntries = false;
		for (const entry of this.config.entries ?? []) {
			const autofill =
				this.renderTemplate(
					entry.autofill_entity_id as unknown as string,
					this.getEntryContext(entry),
				) ?? true;
			if (autofill && !entry.entity_id) {
				entry.entity_id = this.context.entity_id;
				updateEntries = true;
			}
			entries.push(entry);
		}
		if (updateEntries) {
			this.entriesChanged(entries);
		}

		let editor: TemplateResult<1>;
		switch (this.entryEditorIndex) {
			case -1:
				this.yamlKey = 'root';
				editor = html`
					${this.buildEntryList()}${this.buildAddEntryButton()}
					<div class="root-style-header">CSS Styles</div>
					${this.buildYamlEditor()}${this.buildErrorPanel()}
				`;
				break;
			default:
				editor = html`${this.buildEntryEditor()}${this.buildErrorPanel()}`;
				break;
		}
		return editor;
	}

	renderTemplate(str: string | number | boolean, context: object) {
		context = {
			render: (str2: string) => this.renderTemplate(str2, context),
			...context,
		};

		const res = renderTemplate(this.hass, str as string, context);
		if (res != str) {
			return res;
		}

		// Legacy string interpolation
		if (typeof str == 'string') {
			for (const key of ['VALUE', 'HOLD_SECS', 'UNIT']) {
				if (str == key) {
					return context[key as keyof object] as string;
				} else if (str.includes(key)) {
					str = str.replace(
						new RegExp(key, 'g'),
						(context[key as keyof object] ?? '') as string,
					);
				}
			}
		}

		return str;
	}

	getEntryContext(entry: IEntry) {
		const context = {
			VALUE: 0,
			HOLD_SECS: 0,
			UNIT: '',
			value: 0,
			hold_secs: 0,
			unit: '',
			config: {
				...entry,
				entity: '',
				attribute: '',
			},
		};
		context.config.attribute = this.renderTemplate(
			entry.value_attribute as string,
			context,
		) as string;
		context.config.entity = this.renderTemplate(
			entry.entity_id as string,
			context,
		) as string;
		const unit = this.renderTemplate(
			entry.unit_of_measurement as string,
			context,
		) as string;
		(context.UNIT = unit), (context.unit = unit);
		const value = this.getFeatureValue(
			context.config.entity,
			context.config.attribute,
		);
		context.VALUE = value;
		return context;
	}

	getFeatureValue(entityId: string, valueAttribute: string) {
		if (!this.hass.states[entityId]) {
			return '';
		} else if (valueAttribute == 'state' || !valueAttribute) {
			return this.hass.states[entityId].state;
		} else {
			let value;
			const indexMatch = valueAttribute.match(/\[\d+\]$/);
			if (indexMatch) {
				const index = parseInt(indexMatch[0].replace(/\[|\]/g, ''));
				valueAttribute = valueAttribute.replace(indexMatch[0], '');
				value = this.hass.states[entityId].attributes[valueAttribute];
				if (value && Array.isArray(value) && value.length) {
					return value[index];
				} else {
					return undefined;
				}
			} else {
				value = this.hass.states[entityId].attributes[valueAttribute];
			}
			if (value != undefined || valueAttribute == 'elapsed') {
				switch (valueAttribute) {
					case 'brightness':
						return Math.round(
							(100 * parseInt((value as string) ?? 0)) / 255,
						);
					case 'elapsed':
						if (entityId.startsWith('timer.')) {
							if (
								this.hass.states[entityId as string].state ==
								'idle'
							) {
								return 0;
							} else {
								const durationHMS =
									this.hass.states[
										entityId as string
									].attributes.duration.split(':');
								const durationSeconds =
									parseInt(durationHMS[0]) * 3600 +
									parseInt(durationHMS[1]) * 60 +
									parseInt(durationHMS[2]);
								const endSeconds = Date.parse(
									this.hass.states[entityId as string]
										.attributes.finishes_at,
								);
								return Math.floor(
									Math.min(
										durationSeconds,
										endSeconds - Date.now(),
									),
								);
							}
						}
					// falls through
					default:
						return value;
				}
			}
			return value;
		}
	}

	static get styles() {
		return css`
			:host {
				display: flex !important;
				flex-direction: column;
			}
			.content {
				padding: 12px;
				display: inline-flex;
				flex-direction: column;
				gap: 24px;
				box-sizing: border-box;
				width: 100%;
			}

			ha-expansion-panel {
				display: block;
				border-radius: 6px;
				border: solid 1px var(--outline-color);
				--ha-card-border-radius: 6px;
				--expansion-panel-content-padding: 0;
			}
			ha-icon {
				display: flex;
				color: var(--secondary-text-color);
			}
			ha-button-menu {
				margin: 0 18px 12px;
			}
			ha-button {
				width: fit-content;
				--mdc-icon-size: 100%;
			}
			ha-list-item {
				text-transform: capitalize;
			}

			.feature {
				display: flex;
				align-items: center;
				pointer-events: none;

				.handle {
					cursor: move;
					cursor: grab;
					padding-right: 8px;
					padding-inline-end: 8px;
					padding-inline-start: initial;
					direction: var(--direction);
					pointer-events: all;
				}
			}

			.feature-content {
				height: 60px;
				font-size: 16px;
				display: flex;
				align-items: center;
				justify-content: flex-start;
				flex-grow: 1;
				gap: 8px;
			}
			span {
				text-transform: capitalize;
			}
			.feature-content div {
				display: flex;
				flex-direction: column;
			}
			.secondary {
				font-size: 12px;
				color: var(--secondary-text-color);
			}

			.edit-icon,
			.remove-icon {
				color: var(--secondary-text-color);
				pointer-events: all;
				--mdc-icon-button-size: 36px;
			}

			.header {
				display: inline-flex;
				justify-content: space-between;
				align-items: center;

				ha-icon {
					color: var(
						--mdc-dialog-content-ink-color,
						rgba(0, 0, 0, 0.6)
					);
				}
			}
			.back-title {
				display: flex;
				align-items: center;
				font-size: 18px;
			}

			.wrapper {
				width: 100%;
			}
			.gui-editor,
			.yaml-editor {
				display: inline-flex;
				flex-direction: column;
				gap: 24px;
				padding: 8px 0px;
				width: 100%;
			}
			ha-code-editor {
				--code-mirror-max-height: calc(100vh - 245px);
			}
			.error,
			.info {
				word-break: break-word;
				margin-top: 8px;
			}
			.error {
				color: var(--error-color);
			}
			.error ul {
				margin: 4px 0;
			}
			.warning li,
			.error li {
				white-space: pre-wrap;
			}

			.panel-header {
				display: inline-flex;
				gap: 4px;
			}

			paper-tabs {
				color: var(--primary-text-color);
				text-transform: uppercase;
				border-bottom: 1px solid var(--divider-color);
				--paper-tabs-selection-bar-color: var(--primary-color);
			}
			paper-tab.iron-selected {
				box-shadow: inset 0 -2px 0 0 var(--primary-color);
				transition: box-shadow 1s;
			}

			.form {
				display: grid;
				grid-template-columns: repeat(
					var(--form-grid-column-count, auto-fit),
					minmax(var(--form-grid-min-width, 200px), 1fr)
				);
				gap: 24px 8px;
			}

			.style-header {
				font-weight: 500;
				margin-left: 4px;
			}
			.root-style-header {
				font-weight: 500;
				margin-left: 20px;
			}
		`;
	}
}
