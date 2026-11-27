/**
 * Proyección del mapa de comercio exterior: Lambert azimutal de áreas iguales centrada en
 * Sudamérica (no exagera la Patagonia como Mercator). Sin imports: la usan también el generador
 * de geometría (scripts/build-geometry.ts) y el render en el navegador o en el build.
 */

export type LonLat = readonly [lon: number, lat: number];
export type Point = readonly [x: number, y: number];

/** Lienzo en unidades SVG. El continente ocupa el centro; los bordes reciben rutas que vienen de fuera. */
export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 1200;

const CENTER_LON = -60;
const CENTER_LAT = -21;
/** Escala y desplazamiento ajustados para que el continente quede con margen para etiquetas. */
const SCALE = 760;
const OFFSET_X = 520;
const OFFSET_Y = 560;

const toRadians = Math.PI / 180;
const sinLat0 = Math.sin(CENTER_LAT * toRadians);
const cosLat0 = Math.cos(CENTER_LAT * toRadians);

export function project([lon, lat]: LonLat): Point {
  const lambda = (lon - CENTER_LON) * toRadians;
  const phi = lat * toRadians;
  const cosPhi = Math.cos(phi);
  const k = Math.sqrt(2 / (1 + sinLat0 * Math.sin(phi) + cosLat0 * cosPhi * Math.cos(lambda)));
  const x = k * cosPhi * Math.sin(lambda);
  const y = k * (cosLat0 * Math.sin(phi) - sinLat0 * cosPhi * Math.cos(lambda));
  return [OFFSET_X + SCALE * x, OFFSET_Y - SCALE * y];
}
