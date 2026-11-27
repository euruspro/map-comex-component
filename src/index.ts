/**
 * @euruspro/map-comex-component: mapa de comercio exterior de EURUS PRO®.
 * Esta entrada no toca el DOM: sirve en el build (SSR/SSG) y en el navegador.
 * Web Component: `@euruspro/map-comex-component/element` (sin registro) o `/define` (registra).
 */
export { CYCLE_SECONDS, renderTradeMap, type TradeMapMarkup, type TradeMapOptions } from './render.js';
export { tradeMapStyles } from './styles.js';
export {
  customsNodes,
  tradeRoutes,
  type CountryCode,
  type CustomsNode,
  type FlowDirection,
  type TradeRoute,
  type TransportMode,
} from './network.js';
export { project, VIEW_HEIGHT, VIEW_WIDTH, type LonLat, type Point } from './projection.js';
