import { load } from 'js-yaml';
import { AUTOFILL } from '../models/constants';
import { IAction, IOption } from '../models/interfaces';
import {
	buildTemplatedOption,
	deepGet,
	defaultOptionAction,
	resolveOptionsAttribute,
	unescapeHtml,
} from '../utils';
import { BaseCustomFeature } from './base-custom-feature';

export class BaseOptionSelectCustomFeature extends BaseCustomFeature {
	options: IOption[] = [];
	optionsSignature?: string;

	setOptions(): boolean {
		if (
			this.renderTemplate(this.config.option_type ?? 'default') == 'default'
		) {
			const signature = `list:${JSON.stringify(this.config.options)}`;
			if (signature == this.optionsSignature) {
				return false;
			}
			this.optionsSignature = signature;
			this.options = (this.config.options ?? []) as IOption[];
			return true;
		}

		const source = this.resolveDynamicOptions();
		if (!source) {
			this.optionsSignature = undefined;
			if (this.options.length) {
				this.options = [];
				return true;
			}
			return false;
		}

		if (source.signature == this.optionsSignature) {
			return false;
		}
		this.optionsSignature = source.signature;
		this.options = source.items
			.filter((item) => item != undefined && item !== '')
			.map((item) => this.buildOption(item, source.attribute));
		return true;
	}

	resolveAttributeSource():
		| { entityId: string; attribute: string }
		| undefined {
		if (this.config.option_type != 'attribute') {
			return undefined;
		}

		const entityId = String(
			this.renderTemplate(this.config.option_entity as string),
		);
		const attribute = resolveOptionsAttribute(
			String(this.renderTemplate(this.config.option_attribute as string)),
			entityId,
		);
		return { entityId, attribute };
	}

	resolveDynamicOptions():
		| { items: string[]; signature: string; attribute?: string }
		| undefined {
		const optionSignature = JSON.stringify([
			this.config.option_template ?? undefined,
			this.config.autofill_entity_id ?? undefined,
			String(this.renderTemplate((this.config.entity_id ?? '') as string)),
		]);

		const attrSource = this.resolveAttributeSource();
		if (attrSource) {
			const { entityId, attribute } = attrSource;
			if (!attribute) {
				return undefined;
			}
			const items = (deepGet(
				this.hass.states[entityId]?.attributes,
				attribute,
			) ?? []) as string[];
			return {
				items,
				signature: `attr:${entityId}:${attribute}:${items.toString()}:${optionSignature}`,
				attribute,
			};
		}
		if (this.config.option_type == 'template') {
			let optionsTemplate = this.config.options_template ?? '';
			if (optionsTemplate.includes('- ')) {
				const itemsObj = load(optionsTemplate) as string[];
				if (Array.isArray(itemsObj)) {
					optionsTemplate = itemsObj.join(',');
				} else {
					optionsTemplate = JSON.stringify(itemsObj);
				}
			}
			const items = (
				this.renderTemplate(optionsTemplate.trim() ?? '') as string
			)
				.split(',')
				.flat()
				.map((i) => unescapeHtml(i).trim());

			return {
				items,
				signature: `tmpl:${items.toString()}:${optionSignature}`,
			};
		}

		return undefined;
	}

	buildOption(item: unknown, sourceAttribute?: string): IOption {
		const option = buildTemplatedOption(item, this.config.option_template);

		const featureEntity = String(
			this.renderTemplate((this.config.entity_id ?? '') as string),
		);

		if (featureEntity && option.entity_id == undefined) {
			option.entity_id = featureEntity;
		}

		const autofill = this.renderTemplate(
			(option.autofill_entity_id ??
				this.config.autofill_entity_id ??
				AUTOFILL) as unknown as string,
		);

		if (autofill) {
			const domain = featureEntity.split('.')[0];
			const action = defaultOptionAction(domain, sourceAttribute ?? '');
			if (action) {
				option.tap_action ||= {
					action: 'perform-action',
					perform_action: action.perform_action,
					data: { [action.data_key]: option.option },
					target: { entity_id: featureEntity },
				} as IAction;
			}
		}

		return option;
	}
}
