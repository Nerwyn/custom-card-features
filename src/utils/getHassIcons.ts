import { HomeAssistant } from '../models/interfaces/HomeAssistant';
import {
	CategoryType,
	IconCategory,
	IconResources,
} from '../models/interfaces/IHassIcons';

/**
 * https://github.com/home-assistant/frontend/blob/adc33934224628b42057b09a757155c915812c14/src/data/icons.ts
 * @param {HomeAssistant} hass
 * @param {T} category
 * @param {string} [integration]
 * @returns {Promise<IconResources<CategoryType[T]>>}
 */
export async function getHassIcons<T extends IconCategory>(
	hass: HomeAssistant,
	category: T,
	integration?: string,
) {
	return await hass.callWS<IconResources<CategoryType[T]>>({
		type: 'frontend/get_icons',
		category,
		integration,
	});
}
