/**
 * Núcleo del mapa de comercio exterior: genera el HTML (SVG fijo + capa animada) y el CSS de una
 * instancia como texto, sin DOM ni dependencias. Sirve igual para generar en el build (Astro, SSR)
 * y en el navegador (Web Component).
 *
 * Rendimiento: lo fijo (continente, rutas, nodos) es un SVG que no se anima. Lo que se mueve
 * (vehículos, pulsos y estados) son elementos HTML animados solo con transform y opacity, que el
 * navegador compone en GPU sin repintar ni recalcular estilos en el hilo principal. Las posiciones
 * van en unidades del contenedor (cqw), así escalan con el mapa.
 *
 * Todas las rutas comparten un ciclo: pausar (fuera de pantalla, botón de pausa) las mantiene
 * sincronizadas con sus nodos. Sin atributos style: funciona con CSP estricta.
 */
import { buildGeometry, flightArc, pointAtFraction, smoothThrough, toPathData, type RouteGeometry } from './curves.js';
import { checkGlyph, vehicleGlyphs } from './icons.js';
import { landPath } from './land.js';
import { customsNodes, tradeRoutes, type CustomsNode, type TradeRoute, type TransportMode } from './network.js';
import { project, VIEW_HEIGHT, VIEW_WIDTH, type Point } from './projection.js';

export interface TradeMapOptions {
  /** Prefijo de ids, keyframes y rutas. Distinto por instancia si hay más de un mapa en el mismo documento. */
  readonly idPrefix?: string;
  /** Muestra el estado aduanero (texto) al completarse el trámite en nodos con `status`. */
  readonly labels?: boolean;
  readonly routes?: readonly TradeRoute[];
  readonly nodes?: readonly CustomsNode[];
}

export interface TradeMapMarkup {
  /** Escenario completo (`.tm-stage`): SVG fijo + capa animada. */
  readonly html: string;
  /** Posiciones y keyframes de esta instancia. Se usa junto con `tradeMapStyles`. */
  readonly css: string;
}

/** Ciclo común (s): todas las rutas se repiten con el mismo periodo, desfasadas. */
export const CYCLE_SECONDS = 18;
/** Velocidad en unidades del lienzo por segundo y límites del viaje. */
const SPEED: Readonly<Record<TransportMode, number>> = { sea: 34, air: 80, land: 26 };
const MIN_TRAVEL_SECONDS = 5;
const MAX_TRAVEL_SECONDS = 9.5;
/** Puntos del recorrido en los keyframes (más = curva más fiel, más CSS). */
const KEYFRAME_STEPS = 18;
/** Exportación: el trámite ocurre primero y el vehículo sale después. */
const EXPORT_DEPARTURE = 0.16;
/** Separación entre el nodo y su estado, en unidades del lienzo. */
const CHIP_GAP = 18;

const ID_PATTERN = /^[a-zA-Z][\w-]*$/;

const round = (value: number, decimals = 1): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
/** Unidades del lienzo → % del ancho / alto del escenario. */
const percentX = (x: number): number => round((x / VIEW_WIDTH) * 100, 2);
const percentY = (y: number): number => round((y / VIEW_HEIGHT) * 100, 2);
/** Unidades del lienzo → cqw (1 cqw = 1 % del ancho del escenario, en ambos ejes). */
const cqw = (value: number): number => round((value / VIEW_WIDTH) * 100, 2);
const keyframePercent = (fraction: number): string => `${round(fraction * 100, 1)}%`;
const easeInOut = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

interface ResolvedRoute {
  readonly route: TradeRoute;
  readonly node: CustomsNode;
  readonly flowName: string;
  readonly nodePoint: Point;
  readonly geometry: RouteGeometry;
  readonly pathData: string;
  /** Fracciones del ciclo. */
  readonly travelStart: number;
  readonly travelEnd: number;
  /** Momento del trámite en el nodo (llegada o, en exportación, antes de salir). */
  readonly eventAt: number;
  readonly delaySeconds: number;
}

function resolveRoutes(prefix: string, routes: readonly TradeRoute[], nodes: readonly CustomsNode[]): ResolvedRoute[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  return routes.map((route, index) => {
    if (!ID_PATTERN.test(route.id)) throw new Error(`tradeMap: id de ruta inválido "${route.id}".`);
    const node = nodesById.get(route.nodeId);
    if (node === undefined) throw new Error(`tradeMap: la ruta "${route.id}" apunta a un nodo inexistente (${route.nodeId}).`);
    if (route.waypoints.length === 0) throw new Error(`tradeMap: la ruta "${route.id}" no tiene recorrido.`);
    const nodePoint = project(node.at);
    const waypoints = route.waypoints.map((lonLat) => project(lonLat));
    const points = route.direction === 'import' ? [...waypoints, nodePoint] : [nodePoint, ...waypoints];
    const segments =
      route.mode === 'air' ? flightArc(points[0] as Point, points[points.length - 1] as Point) : smoothThrough(points);
    const geometry = buildGeometry(segments);
    const travelSeconds = Math.min(Math.max(geometry.length / SPEED[route.mode], MIN_TRAVEL_SECONDS), MAX_TRAVEL_SECONDS);
    const travelStart = route.direction === 'import' ? 0 : EXPORT_DEPARTURE;
    const travelEnd = travelStart + travelSeconds / CYCLE_SECONDS;
    return {
      route,
      node,
      flowName: `${prefix}-${route.id}`,
      nodePoint,
      geometry,
      pathData: toPathData(segments),
      travelStart,
      travelEnd,
      eventAt: route.direction === 'import' ? travelEnd : 0.01,
      // Desfase negativo: al cargar, cada ruta ya va en una fase distinta del ciclo.
      delaySeconds: -round((index / routes.length) * CYCLE_SECONDS),
    };
  });
}

type Frames = Map<number, string[]>;

function addFrame(frames: Frames, at: number, declaration: string): void {
  const key = round(Math.min(Math.max(at, 0), 1), 3);
  const list = frames.get(key);
  if (list === undefined) frames.set(key, [declaration]);
  else list.push(declaration);
}

function keyframes(name: string, frames: Frames): string {
  const body = [...frames.entries()]
    .sort(([a], [b]) => a - b)
    .map(([at, declarations]) => `${keyframePercent(at)}{${declarations.join(';')}}`)
    .join('');
  return `@keyframes ${name}{${body}}`;
}

const translate = ([x, y]: Point): string => `transform:translate(${cqw(x)}cqw,${cqw(y)}cqw)`;

function flowCss(resolved: ResolvedRoute, labels: boolean): string {
  const { geometry, travelStart, travelEnd, eventAt, route, nodePoint, flowName, node } = resolved;
  const span = travelEnd - travelStart;
  const isImport = route.direction === 'import';
  const showChip = labels && route.status !== undefined;

  // Vehículo: posiciones a tiempos parejos con avance suavizado (acelera y frena).
  const vehicle: Frames = new Map();
  for (let step = 0; step <= KEYFRAME_STEPS; step++) {
    const at = travelStart + (span * step) / KEYFRAME_STEPS;
    addFrame(vehicle, at, translate(pointAtFraction(geometry, easeInOut(step / KEYFRAME_STEPS))));
  }
  if (travelStart > 0) addFrame(vehicle, 0, translate(nodePoint));
  addFrame(vehicle, 1, translate(pointAtFraction(geometry, 1)));
  addFrame(vehicle, 0, 'opacity:0');
  addFrame(vehicle, travelStart + 0.03, 'opacity:1');
  addFrame(vehicle, isImport ? travelEnd : travelEnd - 0.04, 'opacity:1');
  addFrame(vehicle, isImport ? travelEnd + 0.03 : travelEnd, 'opacity:0');
  addFrame(vehicle, 1, 'opacity:0');

  // Pulso del nodo: el trámite se completa.
  const pulse: Frames = new Map();
  addFrame(pulse, 0, 'opacity:0;transform:scale(.6)');
  addFrame(pulse, eventAt, 'opacity:0;transform:scale(.6)');
  addFrame(pulse, eventAt + 0.005, 'opacity:.9;transform:scale(1)');
  addFrame(pulse, eventAt + 0.09, 'opacity:0;transform:scale(3.4)');
  addFrame(pulse, 1, 'opacity:0;transform:scale(3.4)');

  // Estado: aparece, se mantiene ~4 s y se va.
  const chip: Frames = new Map();
  addFrame(chip, 0, 'opacity:0;transform:translateY(.5em)');
  addFrame(chip, eventAt + 0.01, 'opacity:0;transform:translateY(.5em)');
  addFrame(chip, eventAt + 0.04, 'opacity:1;transform:translateY(0)');
  addFrame(chip, eventAt + 0.24, 'opacity:1;transform:translateY(0)');
  addFrame(chip, eventAt + 0.28, 'opacity:0;transform:translateY(0)');
  addFrame(chip, 1, 'opacity:0;transform:translateY(0)');

  const flow = `[data-flow="${flowName}"]`;
  const [nx, ny] = nodePoint;
  const chipPosition =
    node.labelSide === 'right'
      ? `left:${percentX(nx + CHIP_GAP)}%;top:${percentY(ny)}%`
      : `right:${round(100 - percentX(nx - CHIP_GAP), 2)}%;top:${percentY(ny)}%`;

  return [
    `${flow}{--tm-delay:${resolved.delaySeconds}s;--tm-v:${flowName}-v;--tm-p:${flowName}-p;--tm-c:${flowName}-c}`,
    `${flow} .tm-pulse{left:${percentX(nx)}%;top:${percentY(ny)}%}`,
    showChip ? `${flow} .tm-chip{${chipPosition}}` : '',
    keyframes(`${flowName}-v`, vehicle),
    keyframes(`${flowName}-p`, pulse),
    showChip ? keyframes(`${flowName}-c`, chip) : '',
  ].join('');
}

function flowHtml(resolved: ResolvedRoute, prefix: string, labels: boolean): string {
  const { route, flowName } = resolved;
  const chip =
    labels && route.status !== undefined
      ? `<span class="tm-chip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12"/><path d="${checkGlyph}"/></svg>${escapeHtml(route.status)}</span>`
      : '';
  return (
    `<div class="tm-flow" data-flow="${flowName}" data-priority="${route.priority}">` +
    '<span class="tm-pulse"></span>' +
    chip +
    `<span class="tm-vehicle tm-vehicle--${route.mode}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${prefix}-glyph-${route.mode}"/></svg></span>` +
    '</div>'
  );
}

export function renderTradeMap(options: TradeMapOptions = {}): TradeMapMarkup {
  const prefix = options.idPrefix ?? 'tm';
  if (!ID_PATTERN.test(prefix)) throw new Error(`tradeMap: idPrefix inválido "${prefix}".`);
  const labels = options.labels ?? true;
  const nodes = options.nodes ?? customsNodes;
  const resolved = resolveRoutes(prefix, options.routes ?? tradeRoutes, nodes);

  const usedNodeIds = new Set(resolved.map(({ node }) => node.id));
  const nodeMarkup = nodes
    .filter((node) => usedNodeIds.has(node.id))
    .map((node) => {
      const [x, y] = project(node.at);
      return `<g transform="translate(${round(x)} ${round(y)})"><circle class="tm-node-ring" r="9"/><circle class="tm-node-dot" r="4"/></g>`;
    })
    .join('');

  const glyphDefs = (Object.keys(vehicleGlyphs) as TransportMode[])
    .map((mode) => `<symbol id="${prefix}-glyph-${mode}" viewBox="0 0 24 24"><path d="${vehicleGlyphs[mode]}"/></symbol>`)
    .join('');

  const baseSvg =
    `<svg class="tm-base" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" aria-hidden="true" focusable="false">` +
    `<defs><pattern id="${prefix}-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.15" class="tm-dot"/></pattern>` +
    `<path id="${prefix}-continent" d="${landPath}" fill-rule="evenodd"/>${glyphDefs}</defs>` +
    `<use href="#${prefix}-continent" class="tm-land-fill"/>` +
    `<use href="#${prefix}-continent" fill="url(#${prefix}-dots)"/>` +
    `<use href="#${prefix}-continent" class="tm-land-edge"/>` +
    resolved
      .map(({ route, pathData }) => `<path class="tm-route tm-route--${route.mode}" data-priority="${route.priority}" d="${pathData}"/>`)
      .join('') +
    nodeMarkup +
    '</svg>';

  const motion = `<div class="tm-motion">${resolved.map((item) => flowHtml(item, prefix, labels)).join('')}</div>`;

  return {
    html: `<div class="tm-stage" aria-hidden="true">${baseSvg}${motion}</div>`,
    css: resolved.map((item) => flowCss(item, labels)).join(''),
  };
}
