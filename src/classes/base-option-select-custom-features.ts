import { load } from 'js-yaml';
import { IOption, OptionType } from '../models/interfaces';
import { deepGet, unescapeHtml } from '../utils';
import { BaseCustomFeature } from './base-custom-feature';

export class BaseOptionSelectCustomFeature extends BaseCustomFeature {
	options: IOption[] = [];

	setOptions(): boolean {
		let items: string[];

		const optionType = this.renderTemplate(
			this.config.option_type ?? 'default',
		) as OptionType;
		switch (optionType) {
			case 'template': {
				let template = this.config.options_template ?? '';
				if (template.includes('- ')) {
					const itemsObj = load(template) as string[];
					if (Array.isArray(itemsObj)) {
						template = itemsObj.join(',');
					} else {
						template = JSON.stringify(itemsObj);
					}
				}
				items = (this.renderTemplate(template.trim() ?? '') as string)
					.split(',')
					.flat()
					.map((i) => unescapeHtml(i).trim());
				break;
			}
			case 'attribute': {
				const entityId = String(
					this.renderTemplate(this.config.option_entity as string),
				);
				const attribute = this.renderTemplate(
					this.config.option_attribute ?? '',
				) as string;
				items = (deepGet(this.hass.states[entityId]?.attributes, attribute) ??
					[]) as string[];
				break;
			}
			case 'default':
			default:
				if (
					JSON.stringify(this.options) == JSON.stringify(this.config.options)
				) {
					return false;
				}
				this.options = this.config.options ?? [];
				return true;
		}

		if (!items.length) {
			if (this.options.length) {
				this.options = [];
				return true;
			}
			return false;
		}

		const options = items.map((option) => {
			return {
				...this.config.option_template,
				option,
				entity_id: this.config.option_entity ?? this.config.entity_id,
			};
		});
		if (JSON.stringify(options) == JSON.stringify(this.options)) {
			return false;
		}
		this.options = options;
		return true;
	}
}
