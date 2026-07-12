import { load } from 'js-yaml';
import { IOption, OptionType } from '../models/interfaces/IConfig';
import { deepGet } from '../utils/deepKeys';
import { BaseCustomFeature } from './base-custom-feature';

export class BaseOptionSelectCustomFeature extends BaseCustomFeature {
	options: IOption[] = [];

	setOptions(): boolean {
		let items: (string | IOption)[];

		const optionType = this.renderTemplate(
			this.config.option_type ?? 'default',
		) as OptionType;
		switch (optionType) {
			case 'template': {
				const itemsString = this.renderTemplate(
					this.config.options_template ?? '',
				) as string;
				if (itemsString.includes('- ')) {
					let itemsObj = load(itemsString) as (string | IOption)[];
					if (!Array.isArray(itemsObj)) {
						itemsObj = [itemsObj];
					}
					items = itemsObj.map((i) => {
						if (typeof i === 'string') {
							return i.trim();
						} else {
							return i;
						}
					});
				} else {
					items = itemsString
						.split(',')
						.flat()
						.map((i) => i.trim());
				}
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
			const res = {
				...this.config.option_template,
				entity_id: this.config.option_entity ?? this.config.entity_id,
			};
			if (typeof option == 'string') {
				return {
					...res,
					option,
				};
			}
			return {
				...res,
				...option,
			};
		});
		if (JSON.stringify(options) == JSON.stringify(this.options)) {
			return false;
		}
		this.options = options;
		return true;
	}
}
