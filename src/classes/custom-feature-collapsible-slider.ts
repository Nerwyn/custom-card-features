import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { buildStyles } from '../utils/styles';
import { CustomFeatureSlider } from './custom-feature-slider';

const AUTO_COLLAPSE_DEFAULT = 2000;

@customElement('custom-feature-collapsible-slider')
export class CustomFeatureCollapsibleSlider extends CustomFeatureSlider {
	@state() expanded: boolean = false;
	@state() collapsed: boolean = true;

	collapsedHeight?: number;
	expandedHeight?: number;
	autoCollapseMs: number = 0;
	featureHeight: number = 40;

	collapseTimer?: ReturnType<typeof setTimeout>;

	onPointerDown(e: PointerEvent) {
		super.onPointerDown(e);

		if (!this.expanded) {
			return;
		}

		// Delay pressed state to fix initial slider thumb transition
		this.pressed = false;
		this.pressedTimeout = setTimeout(() => (this.pressed = true), 150);

		if (!this.swiping) {
			clearTimeout(this.getValueFromHassTimer);
			this.getValueFromHass = false;
			this.sliderOn = true;

			// iOS tap fix
			const rect = this.slider.getBoundingClientRect();
			let value = (e.clientX - rect.left) / rect.width;
			if (this.rtl) {
				value = 1 - value;
			}
			value = value * (this.range[1] - this.range[0]) + this.range[0];
			this._value = value;
		}
	}

	async onPointerUp(e: PointerEvent) {
		clearTimeout(this.pressedTimeout);

		// Collapsed: a tap reveals the slider instead of firing an action
		if (!this.expanded) {
			this.expand();
			return;
		}

		// Expanded tap (no drag): collapse again to hide the slider
		if (!this.swiping) {
			this.collapse();
			return;
		}

		// Expanded drag: commit the value using the parent slider logic,
		// then optionally auto-collapse after a period of inactivity
		await super.onPointerUp(e);
		this.scheduleCollapse();
	}

	onPointerMove(e: PointerEvent) {
		if (!this.expanded) {
			return;
		}
		super.onPointerMove(e);
	}

	onInput(_e: InputEvent) {
		if (!this.expanded) {
			return;
		}
		super.onInput(_e);
	}

	expand() {
		this.expanded = true;
		this.fireHapticEvent('light');
		this.endAction();
		this.setHeight();
		this.requestUpdate();
	}

	collapse() {
		this.expanded = false;
		clearTimeout(this.collapseTimer);
		this.endAction();
		this.setHeight();
		this.requestUpdate();
	}

	scheduleCollapse() {
		clearTimeout(this.collapseTimer);
		if (this.autoCollapseMs > 0) {
			this.collapseTimer = setTimeout(() => this.collapse(), this.autoCollapseMs);
		}
	}

	setHeight() {
		const height = this.expanded
			? this.expandedHeight ?? this.featureHeight
			: this.collapsedHeight ?? this.featureHeight;
		this.style.setProperty('--feature-height', `${height}px`);
	}

	shouldUpdate(changedProperties: PropertyValues) {
		if (changedProperties.has('expanded')) {
			return true;
		}
		const should = super.shouldUpdate(changedProperties);

		this.collapsed =
			String(this.renderTemplate(this.config.collapsed ?? 'true')) != 'false';

		const collapsedHeight = Number(
			this.renderTemplate(this.config.collapsed_height as unknown as string),
		);
		this.collapsedHeight =
			isNaN(collapsedHeight) || collapsedHeight <= 0
				? undefined
				: collapsedHeight;

		const expandedHeight = Number(
			this.renderTemplate(this.config.expanded_height as unknown as string),
		);
		this.expandedHeight =
			isNaN(expandedHeight) || expandedHeight <= 0
				? undefined
				: expandedHeight;

		const autoCollapse = this.renderTemplate(
			this.config.auto_collapse as unknown as string,
		);
		if (autoCollapse === true || autoCollapse === 'true') {
			this.autoCollapseMs = AUTO_COLLAPSE_DEFAULT;
		} else if (
			autoCollapse === false ||
			autoCollapse === 'false' ||
			autoCollapse == undefined ||
			autoCollapse === ''
		) {
			this.autoCollapseMs = 0;
		} else {
			this.autoCollapseMs = Number(autoCollapse) || 0;
		}

		if (changedProperties.has('config')) {
			this.expanded = !this.collapsed;
		}
		this.setHeight();

		return should;
	}

	firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);

		const featureHeight = getComputedStyle(this).getPropertyValue(
			'--feature-height',
		);
		this.featureHeight = featureHeight ? parseInt(featureHeight) : 40;
		this.expanded = !this.collapsed;
		this.setHeight();
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);

		if (this.expanded) {
			this.setThumbOffset();
		}
	}

	render() {
		if (!this.expanded) {
			return html`
				<div class="collapsed-container" part="container">
					<div class="icon-label">
						${this.buildIcon(this.icon)}${this.buildLabel(this.label)}
					</div>
				</div>
				${buildStyles(this.styles)}
			`;
		}

		return html`
			<div
				class="container ${classMap({
					off: !this.sliderOn,
					[this.thumbType]: true,
				})}"
				part="container"
			>
				${this.buildBackground()}${this.buildSlider()}
				${this.buildThumb()}${this.buildTicks()}
				<div class="icon-label">
					${this.buildIcon(this.icon)} ${this.buildLabel(this.label)}
				</div>
			</div>
			${this.buildTooltip()}${this.buildMD3Thumb()} ${buildStyles(this.styles)}
		`;
	}

	static get styles() {
		return [
			...(super.styles as CSSResult[]),
			css`
				:host {
					cursor: pointer;
					transition:
						height 180ms ease-in-out,
						box-shadow 180ms ease-in-out;
				}

				.collapsed-container {
					all: inherit;
					overflow: hidden;
					height: 100%;
					display: flex;
					flex-flow: column;
					place-content: center;
				}

				.collapsed-container .icon-label {
					height: 100%;
					width: 100%;
					display: flex;
					flex-flow: column;
					justify-content: center;
					align-items: center;
					pointer-events: none;
				}
			`,
		];
	}
}
