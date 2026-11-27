/*!
 * Copyright 2026 EURUS PRO SpA
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Geometría de las rutas: curvas suaves en el lienzo y muestreo por longitud de arco, para que el
 * vehículo avance a velocidad pareja y su estela coincida con la línea dibujada.
 */
import type { Point } from './projection.js';

/** Tramo Bézier cúbico: p0 → p3 con controles p1 y p2. */
export interface CubicSegment {
  readonly p0: Point;
  readonly p1: Point;
  readonly p2: Point;
  readonly p3: Point;
}

export interface RouteGeometry {
  readonly segments: readonly CubicSegment[];
  /** Polilínea densa con longitud acumulada, base del muestreo. */
  readonly samples: readonly Point[];
  readonly cumulative: readonly number[];
  readonly length: number;
}

const SAMPLES_PER_SEGMENT = 48;

/** Catmull-Rom uniforme convertido a Bézier cúbicas (pasa por todos los puntos). */
export function smoothThrough(points: readonly Point[]): CubicSegment[] {
  const segments: CubicSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i] as Point;
    const p3 = points[i + 1] as Point;
    const before = points[i - 1] ?? p0;
    const after = points[i + 2] ?? p3;
    segments.push({
      p0,
      p1: [p0[0] + (p3[0] - before[0]) / 6, p0[1] + (p3[1] - before[1]) / 6],
      p2: [p3[0] - (after[0] - p0[0]) / 6, p3[1] - (after[1] - p0[1]) / 6],
      p3,
    });
  }
  return segments;
}

/** Arco de vuelo: curva hacia un lado, proporcional a la distancia (se lee como ruta aérea). */
export function flightArc(from: Point, to: Point, bend = 0.2): CubicSegment[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const control: Point = [(from[0] + to[0]) / 2 - dy * bend, (from[1] + to[1]) / 2 + dx * bend];
  // Cuadrática elevada a cúbica.
  return [
    {
      p0: from,
      p1: [from[0] + (2 / 3) * (control[0] - from[0]), from[1] + (2 / 3) * (control[1] - from[1])],
      p2: [to[0] + (2 / 3) * (control[0] - to[0]), to[1] + (2 / 3) * (control[1] - to[1])],
      p3: to,
    },
  ];
}

function cubicAt({ p0, p1, p2, p3 }: CubicSegment, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

export function buildGeometry(segments: readonly CubicSegment[]): RouteGeometry {
  const samples: Point[] = [];
  segments.forEach((segment, index) => {
    for (let step = index === 0 ? 0 : 1; step <= SAMPLES_PER_SEGMENT; step++) {
      samples.push(cubicAt(segment, step / SAMPLES_PER_SEGMENT));
    }
  });
  const cumulative = [0];
  for (let i = 1; i < samples.length; i++) {
    const previous = samples[i - 1] as Point;
    const current = samples[i] as Point;
    cumulative.push((cumulative[i - 1] as number) + Math.hypot(current[0] - previous[0], current[1] - previous[1]));
  }
  return { segments, samples, cumulative, length: cumulative[cumulative.length - 1] ?? 0 };
}

/** Punto a una fracción (0–1) de la longitud total. */
export function pointAtFraction(geometry: RouteGeometry, fraction: number): Point {
  const target = Math.min(Math.max(fraction, 0), 1) * geometry.length;
  const { cumulative, samples } = geometry;
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((cumulative[middle] as number) < target) low = middle + 1;
    else high = middle;
  }
  const index = Math.max(low, 1);
  const start = cumulative[index - 1] as number;
  const end = cumulative[index] as number;
  const t = end === start ? 0 : (target - start) / (end - start);
  const a = samples[index - 1] as Point;
  const b = samples[index] as Point;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

const round = (value: number): number => Math.round(value * 10) / 10;

export function toPathData(segments: readonly CubicSegment[]): string {
  const first = segments[0];
  if (first === undefined) return '';
  const head = `M${round(first.p0[0])} ${round(first.p0[1])}`;
  const body = segments
    .map(({ p1, p2, p3 }) => `C${[p1, p2, p3].map(([x, y]) => `${round(x)} ${round(y)}`).join(' ')}`)
    .join('');
  return head + body;
}
