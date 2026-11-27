/**
 * Genera la silueta del mapa de comercio exterior (src/land.ts) a partir de la capa
 * "land" de Natural Earth (dominio público), distribuida como TopoJSON en world-atlas@2.0.2.
 * Se corre a mano, solo si cambia la proyección o la resolución:
 *
 *   curl -sSfL -o /tmp/land-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json
 *   node --experimental-strip-types scripts/build-geometry.ts /tmp/land-50m.json
 *
 * Sin fronteras internas a propósito: el continente es una sola silueta (decisión de marca, evita
 * límites en disputa). Pasos: decodificar arcos → proyectar → recortar al lienzo → simplificar
 * (Douglas-Peucker) → path SVG con coordenadas enteras relativas.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { project, VIEW_HEIGHT, VIEW_WIDTH, type LonLat, type Point } from '../src/projection.ts';

interface Topology {
  type: 'Topology';
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
  objects: Record<string, { type: 'GeometryCollection'; geometries: TopoGeometry[] }>;
}

type TopoGeometry = { type: 'Polygon'; arcs: number[][] } | { type: 'MultiPolygon'; arcs: number[][][] };

/** Píxeles de error tolerados al simplificar (unidades del lienzo). */
const SIMPLIFY_TOLERANCE = 1.1;
/** Islas menores a esta área (unidades²) se descartan: no se ven y suman bytes. */
const MIN_RING_AREA = 6;
/** Recorte con margen: así el borde del recorte queda fuera de la vista y no se dibuja. */
const CLIP_MARGIN = 24;
/** Solo se proyecta lo que cae cerca del continente (evita el hemisferio opuesto). */
const LON_RANGE: readonly [number, number] = [-125, -5];
const LAT_RANGE: readonly [number, number] = [-58, 35];
const OUTPUT_FILE = new URL('../src/land.ts', import.meta.url);

const sourcePath = process.argv[2];
if (sourcePath === undefined) {
  console.error('Uso: node --experimental-strip-types scripts/build-geometry.ts <land-50m.json>');
  process.exit(1);
}

let topology: Topology;
try {
  topology = JSON.parse(readFileSync(sourcePath, 'utf8')) as Topology;
} catch (error) {
  console.error(`No se pudo leer el TopoJSON en ${sourcePath}:`, error);
  process.exit(1);
}

const landObject = topology.objects['land'];
if (topology.type !== 'Topology' || landObject === undefined) {
  console.error('El archivo no es un TopoJSON de world-atlas con el objeto "land".');
  process.exit(1);
}

/** Arcos decodificados (cuantización + deltas) a lon/lat. */
const [scaleX, scaleY] = topology.transform.scale;
const [translateX, translateY] = topology.transform.translate;
const decodedArcs: LonLat[][] = topology.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]): LonLat => {
    x += dx;
    y += dy;
    return [x * scaleX + translateX, y * scaleY + translateY];
  });
});

function ringFromArcs(arcIndexes: number[]): LonLat[] {
  const ring: LonLat[] = [];
  for (const index of arcIndexes) {
    const arc = index >= 0 ? decodedArcs[index] : decodedArcs[~index]?.slice().reverse();
    if (arc === undefined) throw new Error(`Arco ${index} inexistente.`);
    // Cada arco repite el último punto del anterior.
    ring.push(...(ring.length > 0 ? arc.slice(1) : arc));
  }
  return ring;
}

function intersectsRange(ring: LonLat[]): boolean {
  return ring.some(([lon, lat]) => lon >= LON_RANGE[0] && lon <= LON_RANGE[1] && lat >= LAT_RANGE[0] && lat <= LAT_RANGE[1]);
}

/** Sutherland–Hodgman contra el rectángulo del lienzo (con margen). */
function clipRing(ring: Point[]): Point[] {
  const min = -CLIP_MARGIN;
  const maxX = VIEW_WIDTH + CLIP_MARGIN;
  const maxY = VIEW_HEIGHT + CLIP_MARGIN;
  const edges: { inside: (p: Point) => boolean; cross: (a: Point, b: Point) => Point }[] = [
    { inside: (p) => p[0] >= min, cross: (a, b) => lerpAtX(a, b, min) },
    { inside: (p) => p[0] <= maxX, cross: (a, b) => lerpAtX(a, b, maxX) },
    { inside: (p) => p[1] >= min, cross: (a, b) => lerpAtY(a, b, min) },
    { inside: (p) => p[1] <= maxY, cross: (a, b) => lerpAtY(a, b, maxY) },
  ];
  let output = ring;
  for (const edge of edges) {
    const input = output;
    output = [];
    input.forEach((current, i) => {
      const previous = input[(i + input.length - 1) % input.length] as Point;
      if (edge.inside(current)) {
        if (!edge.inside(previous)) output.push(edge.cross(previous, current));
        output.push(current);
      } else if (edge.inside(previous)) {
        output.push(edge.cross(previous, current));
      }
    });
    if (output.length === 0) break;
  }
  return output;
}

function lerpAtX(a: Point, b: Point, x: number): Point {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + t * (b[1] - a[1])];
}

function lerpAtY(a: Point, b: Point, y: number): Point {
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), y];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / length;
}

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let maxDistance = 0;
    let maxIndex = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = perpendicularDistance(points[i] as Point, points[start] as Point, points[end] as Point);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    if (maxDistance > tolerance && maxIndex > 0) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

function ringArea(ring: Point[]): number {
  let area = 0;
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length] as Point;
    area += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(area / 2);
}

/** Path con el primer punto absoluto y el resto relativos, calculados desde coordenadas ya redondeadas. */
function toPath(ring: Point[]): string {
  const rounded = ring.map(([x, y]): Point => [Math.round(x), Math.round(y)]);
  const deduped = rounded.filter((p, i) => i === 0 || p[0] !== rounded[i - 1]?.[0] || p[1] !== rounded[i - 1]?.[1]);
  if (deduped.length < 3) return '';
  const [first, ...rest] = deduped as [Point, ...Point[]];
  let previous = first;
  const segments = rest.map((p) => {
    const delta = `${p[0] - previous[0]} ${p[1] - previous[1]}`.replace(/ -/g, '-');
    previous = p;
    return delta;
  });
  return `M${first[0]} ${first[1]}l${segments.join(' ').replace(/ -/g, '-')}z`;
}

const polygons = landObject.geometries.flatMap((geometry) => (geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs));
const paths: string[] = [];
let pointCount = 0;

for (const polygon of polygons) {
  // Anillo exterior + agujeros (lagos grandes); con fill-rule evenodd se respetan.
  for (const arcIndexes of polygon) {
    const ring = ringFromArcs(arcIndexes);
    if (!intersectsRange(ring)) continue;
    const projected = ring
      .filter(([lon]) => lon >= LON_RANGE[0] - 60 && lon <= LON_RANGE[1] + 60)
      .map((lonLat) => project(lonLat));
    const clipped = clipRing(projected);
    if (clipped.length < 3) continue;
    const simplified = simplify([...clipped, clipped[0] as Point], SIMPLIFY_TOLERANCE).slice(0, -1);
    if (simplified.length < 3 || ringArea(simplified) < MIN_RING_AREA) continue;
    const path = toPath(simplified);
    if (path === '') continue;
    pointCount += simplified.length;
    paths.push(path);
  }
}

const landPath = paths.join('');
const output = `/**
 * GENERADO por scripts/build-geometry.ts. No editar a mano.
 * Fuente: Natural Earth 1:50m "land" (dominio público) vía world-atlas@2.0.2.
 * ${paths.length} anillos, ${pointCount} puntos, tolerancia ${SIMPLIFY_TOLERANCE}.
 */
export const landPath =
  '${landPath}';
`;

writeFileSync(OUTPUT_FILE, output);
console.log(`build-trade-map: ${paths.length} anillos, ${pointCount} puntos, ${landPath.length} bytes de path.`);
