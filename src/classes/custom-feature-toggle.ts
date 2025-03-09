import { css, CSSResult, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ToggleThumbType } from '../models/interfaces';
import { BaseCustomFeature } from './base-custom-feature';

@customElement('custom-feature-toggle')
export class CustomFeatureToggle extends BaseCustomFeature {
	@state() checked: boolean = false;
	direction?: 'left' | 'right';

	async onPointerUp(_e: PointerEvent) {
		if (!this.swiping) {
			if (this.direction) {
				// TODO rtl fix?
				// Only fire on swipe if it's in the right direction
				const checked = this.direction == 'right';
				if (this.checked == checked) {
					this.endAction();
					this.resetGetValueFromHass();
					return;
				}
			}
			this.getValueFromHass = false;
			clearTimeout(this.getValueFromHassTimer);
			this.checked = !this.checked;
			this.fireHapticEvent('light');
			await this.sendAction('tap_action');
		}
		this.endAction();
		this.resetGetValueFromHass();
	}

	onPointerMove(e: PointerEvent) {
		super.onPointerMove(e);

		// Only consider significant enough movement
		const sensitivity = 40;
		const swipeSensitivity = 16;
		const horizontal = (this.currentX ?? 0) - (this.initialX ?? 0);
		if (
			Math.abs(horizontal) <
			Math.abs((this.currentY ?? 0) - (this.initialY ?? 0)) - sensitivity
		) {
			this.swiping = true;
			this.getValueFromHass = true;
			this.setValue();
		} else if (Math.abs(horizontal) > swipeSensitivity) {
			// Swipe detection
			this.direction = horizontal > 0 ? 'right' : 'left';
		}
	}

	endAction() {
		this.direction = undefined;
		super.endAction();
	}

	renderTemplate(str: string, context?: object) {
		context = {
			...context,
			checked: this.checked,
		};
		return super.renderTemplate(str, context);
	}

	setValue() {
		super.setValue();
		if (this.getValueFromHass) {
			this.checked =
				['true', 'yes', 'on', 'enable', '1'].includes(
					String(this.value).toLowerCase(),
				) || Number(this.value) > 0;
		}
	}

	buildMD3Switch() {
		return html``;
	}

	buildMD2Switch() {
		return html``;
	}

	buildCheckbox() {
		return html``;
	}

	buildDefaultToggle() {
		return html`
			<div
				class="container"
				@pointerdown=${this.onPointerDown}
				@pointerup=${this.onPointerUp}
				@pointermove=${this.onPointerMove}
				@pointercancel=${this.onPointerCancel}
				@pointerleave=${this.onPointerLeave}
				@contextmenu=${this.onContextMenu}
			>
				<div class="background"></div>
				<div class="thumb ${this.checked ? 'checked' : ''}">
					${this.buildIcon()}${this.buildLabel()}
				</div>
			</div>
		`;
	}

	render() {
		this.setValue();

		let toggle: TemplateResult<1>;
		switch (this.renderTemplate(this.config.thumb as ToggleThumbType)) {
			case 'md3-switch':
				toggle = this.buildMD3Switch();
				break;
			case 'md2-switch':
				toggle = this.buildMD2Switch();
				break;
			case 'checkbox':
				toggle = this.buildCheckbox();
				break;
			case 'default':
			default:
				toggle = this.buildDefaultToggle();
				break;
		}

		return html`${toggle}${this.buildStyles()} `;
	}

	static get styles(): CSSResult | CSSResult[] {
		return [
			super.styles as CSSResult,
			css`
				:host {
					display: block;
					touch-action: pan-y;
					--color: var(--feature-color);
				}

				.thumb {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					height: 100%;
					width: 50%;
					background: var(--color, var(--state-inactive-color));
					opacity: var(--opacity, 1);
					border-radius: var(--feature-border-radius, 12px);
					transition:
						transform 180ms ease-in-out,
						background-color 180ms ease-in-out;
				}

				.checked {
					transform: translateX(100%);
				}
			`,
		];
	}
}
