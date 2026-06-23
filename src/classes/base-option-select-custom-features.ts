import { AUTOFILL } from '../models/constants';
import { IAction, IOption } from '../models/interfaces';
import {
	buildTemplatedOption,
	deepGet,
	defaultOptionAction,
	parseOptionsList,
	resolveOptionsAttribute,
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

	defaultValueAttribute(): string {
		const attrSource = this.resolveAttributeSource();
		if (attrSource?.attribute) {
			const featureEntity = String(
				this.renderTemplate((this.config.entity_id ?? '') as string),
			);
			const action = defaultOptionAction(
				featureEntity.split('.')[0],
				attrSource.attribute,
			);
			if (action) {
				return action.value_attribute;
			}
		}
		return 'state';
	}

	resolveDynamicOptions():
		| { items: unknown[]; signature: string; attribute?: string }
		| undefined {
		const options = this.config.options;

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
			const value =
				entityId && this.hass.states[entityId]
					? deepGet(this.hass.states[entityId].attributes, attribute)
					: undefined;
			return {
				items: parseOptionsList(value),
				signature: `attr:${entityId}:${attribute}:${JSON.stringify(value ?? undefined)}:${optionSignature}`,
				attribute,
			};
		}
		if (
			this.config.option_type == 'template' &&
			typeof options == 'string' &&
			options.trim()
		) {
			const rendered = String(this.renderTemplate(options));
			return {
				items: parseOptionsList(rendered),
				signature: `tmpl:${rendered}:${optionSignature}`,
			};
		}

		return undefined;
	}

	/**
	 * Build a single generated option from a list item, applying the option
	 * template and a default action derived from the source attribute, so that
	 * generating options from common list attributes (effects, sources, modes,
	 * select options, …) works with no action configuration.
	 */
	buildOption(item: unknown, sourceAttribute?: string): IOption {
		const option = buildTemplatedOption(item, this.config.option_template);

		// The feature entity the action controls. Resolved from the current config
		// (not the cached entityId, which is stale after a config-only change).
		const featureEntity = String(
			this.renderTemplate((this.config.entity_id ?? '') as string),
		);

		// Inherit the parent feature's entity, like the editor autofill does for
		// manual options, so option templates can use `{{ config.entity }}`.
		if (featureEntity && option.entity_id == undefined) {
			option.entity_id = featureEntity;
		}

		// Provide a sensible default action so generating options is zero
		// configuration (mirrors the editor autofill behavior for manual options).
		// The option template can opt out per option with `autofill_entity_id: false`.
		const autofill = this.renderTemplate(
			(option.autofill_entity_id ??
				this.config.autofill_entity_id ??
				AUTOFILL) as unknown as string,
		);
		if (
			autofill &&
			!option.tap_action &&
			!option.double_tap_action &&
			!option.hold_action &&
			!option.momentary_start_action &&
			!option.momentary_repeat_action &&
			!option.momentary_end_action
		) {
			const domain = featureEntity.split('.')[0];
			const action = defaultOptionAction(domain, sourceAttribute ?? '');
			if (action) {
				option.tap_action = {
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
