/**
 * CSS base del mapa (igual para todas las instancias); se usa junto con el `css` de cada instancia.
 *
 * Personalización desde cualquier ancestro (variables CSS heredables):
 *   --tm-accent   cian de marca           (por defecto #00BEE3)
 *   --tm-surface  tinta de marca          (por defecto #001833)
 *   --tm-text     texto sobre oscuro      (por defecto #FFFFFF)
 *   --tm-font     tipografía de estados   (por defecto la heredada)
 * Pensado para fondos oscuros de marca (hero del sitio, login de la app).
 *
 * Comportamiento:
 * - Sin animación con prefers-reduced-motion, con la clase `tm-paused` en el escenario o en un
 *   ancestro, o con `is-offscreen` (fuera de pantalla).
 * - Escenario angosto (< 30rem): fijo, solo continente, rutas principales y nodos (ahorra CPU en
 *   móviles). Entre 30 y 32rem: en movimiento, sin textos de estado (no se leerían).
 */
import { CYCLE_SECONDS } from './render.js';
import { VIEW_HEIGHT, VIEW_WIDTH } from './projection.js';

export const tradeMapStyles = `
.tm-stage{--_accent:var(--tm-accent,#00bee3);--_surface:var(--tm-surface,#001833);--_text:var(--tm-text,#fff);--_vehicle:clamp(22px,3.4cqw,34px);--_pulse:clamp(12px,1.8cqw,18px);position:relative;display:block;width:100%;aspect-ratio:${VIEW_WIDTH}/${VIEW_HEIGHT};container:tm/inline-size}
.tm-base{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tm-motion{position:absolute;inset:0;pointer-events:none}
.tm-land-fill{fill:color-mix(in srgb,var(--_accent) 6%,transparent)}
.tm-dot{fill:color-mix(in srgb,var(--_accent) 34%,transparent)}
.tm-land-edge{fill:none;stroke:color-mix(in srgb,var(--_accent) 30%,transparent);stroke-width:1}
.tm-route{fill:none;stroke:color-mix(in srgb,var(--_accent) 34%,transparent);stroke-width:1.6;stroke-dasharray:3 7;stroke-linecap:round}
.tm-route--air{stroke-dasharray:1.5 8}
.tm-node-ring{fill:color-mix(in srgb,var(--_accent) 12%,transparent);stroke:color-mix(in srgb,var(--_accent) 55%,transparent);stroke-width:1.2}
.tm-node-dot{fill:var(--_accent)}
.tm-vehicle,.tm-pulse,.tm-chip{position:absolute;opacity:0}
.tm-vehicle{left:0;top:0;display:grid;place-items:center;width:var(--_vehicle);height:var(--_vehicle);margin:calc(var(--_vehicle)/-2);border-radius:50%;background:var(--_surface);box-shadow:0 0 0 1.5px color-mix(in srgb,var(--_accent) 75%,transparent),0 0 calc(var(--_vehicle)/2) color-mix(in srgb,var(--_accent) 40%,transparent)}
.tm-vehicle svg{width:60%;height:60%;fill:none;stroke:var(--_accent);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.tm-pulse{width:var(--_pulse);height:var(--_pulse);margin:calc(var(--_pulse)/-2);border:2px solid var(--_accent);border-radius:50%}
.tm-chip{display:inline-flex;align-items:center;gap:.45em;height:2.1em;margin-top:-1.05em;padding:0 .9em 0 .3em;border:1px solid color-mix(in srgb,var(--_accent) 45%,transparent);border-radius:999px;background:color-mix(in srgb,var(--_surface) 92%,transparent);color:var(--_text);font-family:var(--tm-font,inherit);font-size:clamp(11px,2.1cqw,15px);font-weight:600;line-height:1;letter-spacing:.01em;white-space:nowrap}
.tm-chip svg{width:1.45em;height:1.45em;flex:none}
.tm-chip circle{fill:var(--_accent)}
.tm-chip path{fill:none;stroke:var(--_surface);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
@keyframes tm-fade-in{from{opacity:0}}
@media (prefers-reduced-motion:no-preference){
.tm-base{animation:tm-fade-in .9s cubic-bezier(.22,1,.36,1) both}
.tm-flow>.tm-vehicle,.tm-flow>.tm-pulse,.tm-flow>.tm-chip{animation:${CYCLE_SECONDS}s linear var(--tm-delay) infinite both;will-change:transform,opacity}
.tm-flow>.tm-vehicle{animation-name:var(--tm-v)}
.tm-flow>.tm-pulse{animation-name:var(--tm-p)}
.tm-flow>.tm-chip{animation-name:var(--tm-c)}
.tm-paused .tm-flow>*,.is-offscreen .tm-flow>*{animation-play-state:paused}
}
@media (prefers-reduced-motion:reduce){.tm-motion{display:none}}
@container tm (width<32rem){.tm-chip{display:none}}
@container tm (width<30rem){.tm-motion,.tm-route[data-priority="2"]{display:none}}
`;
