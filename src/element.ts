/**
 * Web Component del mapa: <eurus-trade-map labels paused></eurus-trade-map>.
 *
 * - Shadow DOM: ids y keyframes no chocan con la página anfitriona.
 * - Estilos con adoptedStyleSheets: no requiere 'unsafe-inline' en la CSP del anfitrión.
 * - Colores con --tm-accent, --tm-surface, --tm-text y --tm-font desde cualquier ancestro.
 * - Se pausa solo fuera de pantalla; el atributo `paused` lo pausa a pedido (botón "Pausar
 *   animación", WCAG 2.2.2); prefers-reduced-motion lo deja fijo.
 * - El alto sale del ancho (proporción 5:6). El anfitrión define el ancho.
 *
 * Importar este módulo no registra el elemento: usar defineTradeMap() o la entrada `/define`.
 * Es seguro importarlo en el servidor (SSR): solo toca el DOM al conectarse.
 */
import { renderTradeMap } from './render.js';
import { tradeMapStyles } from './styles.js';

export const TRADE_MAP_TAG = 'eurus-trade-map';

/** En el servidor no existe HTMLElement; la clase solo se instancia en el navegador. */
const BaseElement: typeof HTMLElement =
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- sustituto vacío para SSR, nunca se instancia
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export class EurusTradeMap extends BaseElement {
  static readonly observedAttributes = ['labels', 'paused'];

  #visibility: IntersectionObserver | undefined;

  connectedCallback(): void {
    this.#render();
    this.#visibility = new IntersectionObserver((entries) => {
      for (const entry of entries) this.#stage()?.classList.toggle('is-offscreen', !entry.isIntersecting);
    });
    this.#visibility.observe(this);
  }

  disconnectedCallback(): void {
    this.#visibility?.disconnect();
    this.#visibility = undefined;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (!this.isConnected || oldValue === newValue) return;
    if (name === 'paused') this.#syncPaused();
    else this.#render();
  }

  get paused(): boolean {
    return this.hasAttribute('paused');
  }

  set paused(value: boolean) {
    this.toggleAttribute('paused', value);
  }

  #stage(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.tm-stage') ?? null;
  }

  #syncPaused(): void {
    this.#stage()?.classList.toggle('tm-paused', this.paused);
  }

  #render(): void {
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    const { html, css } = renderTradeMap({ labels: this.hasAttribute('labels') });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`:host{display:block}${tradeMapStyles}${css}`);
    root.adoptedStyleSheets = [sheet];
    root.innerHTML = html;
    this.#syncPaused();
  }
}

/** Registra el elemento (idempotente). */
export function defineTradeMap(tagName: string = TRADE_MAP_TAG): void {
  if (typeof customElements === 'undefined' || customElements.get(tagName) !== undefined) return;
  customElements.define(tagName, class extends EurusTradeMap {});
}

declare global {
  interface HTMLElementTagNameMap {
    'eurus-trade-map': EurusTradeMap;
  }
}
