import { css, CSSResult, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { IAction, IActions } from '../models/interfaces/IActions';
import { buildStyles } from '../utils/styles';
import { CustomFeatureSlider } from './custom-feature-slider';

const AUTO_COLLAPSE_DEFAULT = 2000;

@customElement('custom-feature-collapsible-slider')
export class CustomFeatureCollapsibleSlider extends CustomFeatureSlider {
	@property({ type: Boolean, reflect: true }) expanded: boolean = false;
	@state() collapsed: boolean = true;

	collapsedHeight?: number;
	expandedHeight?: number;
	featureHeight: number = 40;
	autoCollapseMs: number = 0;

	autoCollapseTimer?: ReturnType<typeof setTimeout>;
	inputActionDebounce?: ReturnType<typeof setTimeout>;

	setRowExpandedState(expanded: boolean) {
		const row = this.parentElement;
		if (!row?.classList.contains('row')) {
			return;
		}

		if (expanded) {
			row.classList.add('collapsible-slider-active');
			return;
		}

		const otherExpanded = Array.from(
			row.querySelectorAll('custom-feature-collapsible-slider'),
		).some((element) => {
			const slider = element as CustomFeatureCollapsibleSlider;
			return slider != this && slider.expanded;
		});
		if (!otherExpanded) {
			row.classList.remove('collapsible-slider-active');
		}
	}

	onCollapsedPointerUp(_e: PointerEvent) {
		this.expand();
	}

	onClose(e: PointerEvent) {
		e.stopPropagation();
		e.preventDefault();
		this.collapse();
	}

	expand() {
		if (this.expanded) {
			return;
		}
		this.getValueFromHass = true;
		this.setValue();
		this.setSliderState();
		this.expanded = true;
		this.setRowExpandedState(true);
		this.setHeight();
		this.requestUpdate();
	}

	collapse() {
		if (!this.expanded) {
			return;
		}
		clearTimeout(this.autoCollapseTimer);
		this.expanded = false;
		this.setRowExpandedState(false);
		this.setHeight();
		this.requestUpdate();
	}

	async onPointerUp(_e: PointerEvent) {
		clearTimeout(this.pressedTimeout);
		clearTimeout(this.autoCollapseTimer);
		clearTimeout(this.inputActionDebounce);
		this.pressed = false;

		this._value = this.slider.value;
		this.fireHapticEvent('light');

		const action = this.getAction('tap_action');
		const hasAction =
			action &&
			action.action != 'none' &&
			!(action.action == 'perform-action' && !action.perform_action);
		if (hasAction) {
			await this.sendAction('tap_action');
		} else {
			const fallback = this.buildFallbackTapAction();
			if (fallback) {
				await this.sendAction('tap_action', {
					tap_action: fallback,
				} as IActions);
			}
		}

		this.endAction();
		this.resetGetValueFromHass();

		if (this.autoCollapseMs > 0) {
			this.autoCollapseTimer = setTimeout(
				() => this.collapse(),
				this.autoCollapseMs,
			);
		}
	}

	onPointerMove(e: PointerEvent) {
		if (e.isPrimary) {
			if (this.currentX && this.currentY) {
				this.deltaX = e.clientX - this.currentX;
				this.deltaY = e.clientY - this.currentY;
			}
			this.currentX = e.clientX;
			this.currentY = e.clientY;
			this._value = this.slider.value;
		}
		clearTimeout(this.autoCollapseTimer);
	}

	onInput(_e: InputEvent) {
		clearTimeout(this.autoCollapseTimer);
		clearTimeout(this.getValueFromHassTimer);
		this.getValueFromHass = false;
		this._value = this.slider.value;
		this.sliderOn = true;
	}

	buildFallbackTapAction(): IAction | undefined {
		if (!this.entityId) {
			return undefined;
		}

		const [domain] = this.entityId.split('.');
		const action: IAction = {
			action: 'perform-action',
			target: { entity_id: this.entityId },
		};

		switch (domain) {
			case 'light':
				action.perform_action = 'light.turn_on';
				action.data = {
					brightness_pct: Number(this.value ?? this.range[0]),
				};
				return action;
			case 'fan':
				action.perform_action = 'fan.set_percentage';
				action.data = { percentage: Number(this.value ?? this.range[0]) };
				return action;
			case 'media_player':
				action.perform_action = 'media_player.volume_set';
				action.data = {
					volume_level: Number(this.value ?? this.range[0]) / 100,
				};
				return action;
			case 'text':
			case 'input_text':
				action.perform_action = `${domain}.set_value`;
				action.data = { value: String(this.value ?? '') };
				return action;
			case 'number':
			case 'input_number':
				action.perform_action = `${domain}.set_value`;
				action.data = {
					value: Number(this.value ?? this.range[0]),
				};
				return action;
			case 'datetime':
			case 'input_datetime': {
				const hasDate = this.hass.states[this.entityId]?.attributes?.has_date;
				const hasTime = this.hass.states[this.entityId]?.attributes?.has_time;
				const field = `${hasDate ? 'date' : ''}${hasTime ? 'time' : ''}`;
				if (!field) {
					return undefined;
				}

				action.perform_action = `${domain}.set_datetime`;
				action.data = { [field]: String(this.value ?? '') };
				return action;
			}
			default:
				return undefined;
		}
	}

	setHeight() {
		const height = this.expanded
			? this.expandedHeight ?? this.featureHeight
			: this.collapsedHeight ?? this.featureHeight;
		this.style.setProperty('--feature-height', `${height}px`);
	}

	shouldUpdate(changedProperties: PropertyValues) {
		if (changedProperties.has('expanded')) return true;

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
			this.setRowExpandedState(this.expanded);
		}

		this.setHeight();

		return should;
	}

	firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);

		this.expanded = !this.collapsed;
		if (this.expanded) {
			this.setRowExpandedState(true);
		}

		const featureHeight = getComputedStyle(this).getPropertyValue(
			'--feature-height',
		);
		this.featureHeight = featureHeight ? parseInt(featureHeight) : 40;
		this.setHeight();
	}

	updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);

		if (this.expanded) {
			this.setThumbOffset();
		}
	}

	disconnectedCallback() {
		clearTimeout(this.autoCollapseTimer);
		clearTimeout(this.inputActionDebounce);
		this.setRowExpandedState(false);
		super.disconnectedCallback();
	}

	render() {
		if (!this.expanded) {
			return html`
				<div
					class="collapsed-container"
					part="container"
					@pointerup=${this.onCollapsedPointerUp}
					@contextmenu=${this.onContextMenu}
				>
					${this.buildBackground()}
					<div class="icon-label">
						${this.icon || this.label
							? html`${this.buildIcon(this.icon)}${this.buildLabel(
									this.label,
								)}`
							: this.buildIcon('mdi:tune-variant')}
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
			<button
				class="collapse-button"
				part="collapse-button"
				aria-label="Close"
				@pointerdown=${(e: PointerEvent) => e.stopPropagation()}
				@pointerup=${this.onClose}
				@click=${(e: PointerEvent) => e.stopPropagation()}
			>
				<ha-icon .icon=${'mdi:close'}></ha-icon>
			</button>
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
					position: relative;
					height: 100%;
					width: 100%;
					display: flex;
					flex-flow: column;
					justify-content: center;
					align-items: center;
					pointer-events: none;
				}

	:host([expanded]) {
				width: 100%;
				height: var(--feature-height, 40px);
				flex-flow: row;
				align-items: center;
				gap: 4px;
				cursor: default;
			}

				:host([expanded]) .container {
					flex: 1 1 auto;
					width: auto;
					height: 100%;
					position: relative;
					inset: auto;
					overflow: hidden;
				}

				.collapse-button {
					flex: 0 0 auto;
					box-sizing: border-box;
					height: 100%;
					width: var(--feature-height, 40px);
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 0;
					margin: 0;
					border: none;
					border-radius: var(--feature-border-radius, 12px);
					background: rgb(from var(--disabled-color) r g b / 20%);
					color: var(--secondary-text-color);
					cursor: pointer;
					z-index: 6;

					--mdc-icon-size: 20px;
				}
				.collapse-button:focus-visible {
					outline: none;
				}
				@media (hover: hover) {
					.collapse-button:hover {
						color: var(--primary-text-color);
					}
				}
			`,
		];
	}
}
