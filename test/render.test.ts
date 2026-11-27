/*
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
 * Pruebas del núcleo contra el build (dist). Correr con `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customsNodes, renderTradeMap, tradeMapStyles, tradeRoutes, type TradeRoute } from '../dist/index.js';

const idsIn = (html: string): string[] => [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1] ?? '');

describe('renderTradeMap', () => {
  it('es determinista', () => {
    assert.deepEqual(renderTradeMap(), renderTradeMap());
  });

  it('no repite ids y todos llevan el prefijo', () => {
    const ids = idsIn(renderTradeMap({ idPrefix: 'hero' }).html);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => id.startsWith('hero-')));
  });

  it('dos instancias con prefijos distintos no comparten ids ni keyframes', () => {
    const a = renderTradeMap({ idPrefix: 'a' });
    const b = renderTradeMap({ idPrefix: 'b' });
    const idsA = new Set(idsIn(a.html));
    assert.ok(idsIn(b.html).every((id) => !idsA.has(id)));
    const names = (css: string): string[] => [...css.matchAll(/@keyframes ([\w-]+)/g)].map((match) => match[1] ?? '');
    const namesA = new Set(names(a.css));
    assert.ok(names(b.css).every((name) => !namesA.has(name)));
  });

  it('cada referencia href apunta a un id existente', () => {
    const { html } = renderTradeMap();
    const ids = new Set(idsIn(html));
    for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(target ?? ''), `href sin destino: ${target}`);
  });

  it('cada ruta tiene keyframes de vehículo y pulso', () => {
    const { css } = renderTradeMap();
    for (const route of tradeRoutes) {
      assert.match(css, new RegExp(`@keyframes tm-${route.id}-v\\{`));
      assert.match(css, new RegExp(`@keyframes tm-${route.id}-p\\{`));
    }
  });

  it('los estados con texto solo aparecen en Chile y Colombia', () => {
    const countryById = new Map(customsNodes.map((node) => [node.id, node.country]));
    for (const route of tradeRoutes) {
      if (route.status !== undefined) assert.ok(['CL', 'CO'].includes(countryById.get(route.nodeId) ?? ''), route.id);
    }
    const chips = renderTradeMap().html.match(/class="tm-chip"/g) ?? [];
    assert.equal(chips.length, tradeRoutes.filter((route) => route.status !== undefined).length);
  });

  it('sin labels no genera estados', () => {
    const { html, css } = renderTradeMap({ labels: false });
    assert.doesNotMatch(html, /tm-chip/);
    assert.doesNotMatch(css, /-c\{/);
  });

  it('no usa atributos style ni scripts (CSP estricta)', () => {
    const { html } = renderTradeMap();
    assert.doesNotMatch(html, /\sstyle=/);
    assert.doesNotMatch(html, /<script/i);
  });

  it('escapa el texto de los estados', () => {
    const route: TradeRoute = { ...(tradeRoutes[0] as TradeRoute), status: '<img src=x onerror=alert(1)>' };
    const { html } = renderTradeMap({ routes: [route] });
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&#60;img/);
  });

  it('las posiciones animadas usan cqw y solo transform u opacity', () => {
    const { css } = renderTradeMap();
    const declarations = [...css.matchAll(/@keyframes [\w-]+\{(.*?)\}\}/g)].flatMap((match) =>
      [...(match[1] ?? '').matchAll(/([a-z-]+):/g)].map((property) => property[1]),
    );
    assert.ok(declarations.length > 0);
    assert.ok(declarations.every((property) => property === 'transform' || property === 'opacity'), 'solo transform/opacity');
    assert.match(css, /translate\(-?[\d.]+cqw,-?[\d.]+cqw\)/);
  });

  it('rechaza rutas con nodos inexistentes e ids inválidos', () => {
    const base = tradeRoutes[0] as TradeRoute;
    assert.throws(() => renderTradeMap({ routes: [{ ...base, nodeId: 'noExiste' }] }), /nodo inexistente/);
    assert.throws(() => renderTradeMap({ routes: [{ ...base, id: 'a"b' }] }), /id de ruta inválido/);
    assert.throws(() => renderTradeMap({ idPrefix: '1x' }), /idPrefix inválido/);
  });

  it('valida en tiempo de ejecución los campos que van al marcado (sin inyección de atributos)', () => {
    const base = tradeRoutes[0] as TradeRoute;
    const forge = (patch: Record<string, unknown>): TradeRoute => ({ ...base, ...patch }) as unknown as TradeRoute;
    assert.throws(() => renderTradeMap({ routes: [forge({ mode: 'air" onmouseover="alert(1)' })] }), /mode inválido/);
    assert.throws(() => renderTradeMap({ routes: [forge({ direction: 'x' })] }), /direction inválido/);
    assert.throws(() => renderTradeMap({ routes: [forge({ priority: '1" onclick="x' })] }), /priority inválida/);
    assert.throws(() => renderTradeMap({ routes: [forge({ waypoints: [[Number.NaN, 0]] })] }), /coordenadas inválidas/);
    assert.throws(() => renderTradeMap({ routes: [forge({ status: 42 })] }), /status inválido/);
    const node = customsNodes[0] as (typeof customsNodes)[number];
    assert.throws(() => renderTradeMap({ nodes: [{ ...node, labelSide: 'up' } as never], routes: [base] }), /labelSide inválido/);
  });

  it('rechaza ids de ruta o de nodo repetidos', () => {
    const base = tradeRoutes[0] as TradeRoute;
    assert.throws(() => renderTradeMap({ routes: [base, { ...base }] }), /id de ruta repetido/);
    const node = customsNodes[0] as (typeof customsNodes)[number];
    assert.throws(() => renderTradeMap({ nodes: [node, { ...node }] }), /id de nodo repetido/);
  });

  it('las rutas aéreas respetan las escalas intermedias', () => {
    const base = tradeRoutes.find((route) => route.mode === 'air') as TradeRoute;
    const direct = renderTradeMap({ routes: [{ ...base, waypoints: [[-80.3, 27]] }] }).html;
    const withStop = renderTradeMap({ routes: [{ ...base, waypoints: [[-80.3, 27], [-79.5, 9]] }] }).html;
    const curves = (html: string): number => (html.match(/class="tm-route tm-route--air"[^>]*d="([^"]+)"/)?.[1]?.match(/C/g) ?? []).length;
    assert.equal(curves(direct), 1);
    assert.equal(curves(withStop), 2);
  });

  it('los estilos base respetan reduced-motion y la pausa', () => {
    assert.match(tradeMapStyles, /prefers-reduced-motion:no-preference/);
    assert.match(tradeMapStyles, /\.tm-paused \.tm-flow>\*/);
    assert.match(tradeMapStyles, /\.is-offscreen \.tm-flow>\*/);
  });
});
