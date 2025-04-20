import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, IDialog } from '../models/interfaces';

import './dialogs/custom-feature-confirmation-dialog';

@customElement('custom-feature-dialog')
export class CustomFeatureDialog extends LitElement {
	@property() hass!: HomeAssistant;
	@state() config!: IDialog;
	@state() open: boolean = false;
	@state() fadedIn: boolean = false;
	fadedInTimer?: ReturnType<typeof setTimeout> = undefined;
	tabIndex = -1;

	showDialog(config: IDialog) {
		this.config = config;
		this.open = true;
		this.fadedInTimer = setTimeout(() => {
			this.fadedIn = true;
		}, 250);

		const dialog = this.shadowRoot?.querySelector('dialog');
		if (dialog) {
			try {
				dialog.showModal();
			} catch {
				dialog.close();
				dialog.showModal();
			}
			window.addEventListener('popstate', () => this.closeDialog());
		}
	}

	closeDialog(e?: Event) {
		e?.preventDefault();
		clearTimeout(this.fadedInTimer);
		this.fadedIn = false;
		this.open = false;

		if (e?.type == 'cancel' && this.config.type == 'confirmation') {
			const event = new Event('confirmation-result', {
				bubbles: true,
				composed: true,
			});
			event.detail = false;

			this.dispatchEvent(event);
		}

		const dialog = this.shadowRoot?.querySelector('dialog');
		if (dialog) {
			setTimeout(() => {
				try {
					dialog.close();
				} catch {
					dialog.showModal();
					dialog.close();
				}
				window.removeEventListener('popstate', () =>
					this.closeDialog(),
				);
			}, 140);
		}
	}

	onClick(e: MouseEvent) {
		if (this.fadedIn && this.config.type == 'confirmation') {
			const rect = (e.target as HTMLElement)?.getBoundingClientRect();
			if (
				rect &&
				(rect.left > e.clientX ||
					rect.right < e.clientX ||
					rect.top > e.clientY ||
					rect.bottom < e.clientY)
			) {
				const dialog = this.shadowRoot?.querySelector('dialog');
				dialog?.animate(
					[
						{
							transform: 'rotate(-1deg)',
							'animation-timing-function': 'ease-in',
						},
						{
							transform: 'rotate(1.5deg)',
							'animation-timing-function': 'ease-out',
						},
						{
							transform: 'rotate(0deg)',
							'animation-timing-function': 'ease-in',
						},
					],
					{
						duration: 200,
						iterations: 2,
					},
				);
			}
		}
	}

	render() {
		let content = html``;
		let className = '';
		if (this.config) {
			className = this.config.type;
			switch (this.config.type) {
				case 'confirmation':
				default:
					content = html`<custom-feature-confirmation-dialog
						.hass=${this.hass}
						.config=${this.config}
						.open=${this.open && this.fadedIn}
					></custom-feature-confirmation-dialog>`;
					break;
			}
		}

		return html`<dialog
			class="${className} ${this.open ? '' : 'closed'} ${this.fadedIn
				? 'faded-in'
				: 'faded-out'}"
			@dialog-close=${this.closeDialog}
			@cancel=${this.closeDialog}
			@click=${this.onClick}
		>
			${content}
		</dialog>`;
	}

	static get styles() {
		return css`
			:host {
				-webkit-tap-highlight-color: transparent;
				-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
			}

			dialog {
				height: fit-content;
				padding: 24px;
				pointer-events: none;
				display: inline-flex;
				flex-direction: column;
				position: fixed;
				border: none;
				outline: none;
				color: var(--primary-text-color);
				background: var(
					--md-sys-color-surface-container-high,
					var(
						--md-dialog-container-color,
						var(
							--ha-card-background,
							var(--card-background-color, #fff)
						)
					)
				);
				border-start-start-radius: var(
					--md-dialog-container-shape-start-start,
					var(
						--md-dialog-container-shape,
						var(--md-sys-shape-corner-extra-large, 28px)
					)
				);
				border-start-end-radius: var(
					--md-dialog-container-shape-start-end,
					var(
						--md-dialog-container-shape,
						var(--md-sys-shape-corner-extra-large, 28px)
					)
				);
				border-end-end-radius: var(
					--md-dialog-container-shape-end-end,
					var(
						--md-dialog-container-shape,
						var(--md-sys-shape-corner-extra-large, 28px)
					)
				);
				border-end-start-radius: var(
					--md-dialog-container-shape-end-start,
					var(
						--md-dialog-container-shape,
						var(--md-sys-shape-corner-extra-large, 28px)
					)
				);
			}
			dialog[open] {
				pointer-events: all;
				translate: 0 0;
				scale: 1 1;
				opacity: 1;
				transition:
					translate 0.5s cubic-bezier(0.3, 0, 0, 1),
					scale 0.5s cubic-bezier(0.2, 0, 0, 1),
					opacity 0.05s linear;
			}
			dialog.closed {
				translate: 0 -100px;
				scale: 1 0;
				opacity: 0;
				transition:
					translate 0.15s cubic-bezier(0.3, 0, 0, 1),
					scale 0.15s cubic-bezier(0.3, 0, 0.8, 0.15),
					opacity 0.05s linear 0.025s;
			}

			dialog::backdrop {
				background-color: var(
					--md-sys-color-scrim-mode,
					var(
						--md-sys-color-scrim,
						var(--mdc-dialog-scrim-color, #000)
					)
				);
				--md-sys-color-scrim-mode: light-dark(
					var(--md-sys-color-scrim-light),
					var(--md-sys-color-scrim-dark)
				);
			}
			dialog.faded-in::backdrop {
				opacity: 0.32;
				transition: opacity 0.15s linear;
			}
			dialog.faded-out::backdrop {
				opacity: 0;
				transition: opacity 0.075s linear;
			}

			.confirmation {
				width: fit-content;
				min-width: 272px;
			}
		`;
	}
}
