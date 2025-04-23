import { html, TemplateResult } from 'lit';

/**
 * Build user provided CSS styles string, ensuring that it overrides the default styles
 * @param {string} [styles] User CSS styles string
 * @returns {TemplateResult<1>} lit HTML template with user CSS styles in a style tag
 */
export function buildStyles(styles?: string): TemplateResult<1> {
	if (!styles) {
		return html``;
	}

	// Ensure user styles override default styles
	let importantStyles = styles
		.replace(/ !important/g, '')
		.replace(/;/g, ' !important;');

	// Remove !important from keyframes
	// Initial check to avoid expensive regex for most user styles
	if (importantStyles.includes('@keyframes')) {
		const keyframeses = importantStyles.match(
			/@keyframes .*?\s{(.|\s)*?}\s}/g,
		);
		for (const keyframes of keyframeses ?? []) {
			importantStyles = importantStyles.replace(
				keyframes,
				keyframes.replace(/ !important/g, ''),
			);
		}
	}

	return html`<style id="user-styles">
		${importantStyles}
	</style>`;
}
