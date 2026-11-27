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
 * Reporta el peso del paquete: el Web Component completo (minificado) y el HTML + CSS que genera
 * una instancia, ambos comprimidos con gzip. Requiere `npm run build` antes.
 */
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { renderTradeMap, tradeMapStyles } from '../dist/index.js';

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

const bundle = await build({
  entryPoints: [new URL('../dist/define.js', import.meta.url).pathname],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  write: false,
});
const elementCode = bundle.outputFiles[0]?.contents;
if (elementCode === undefined) throw new Error('esbuild no generó salida.');
console.log(`Web Component (define, minificado): ${kb(elementCode.byteLength)} · gzip ${kb(gzipSync(elementCode, { level: 9 }).byteLength)}`);

for (const labels of [true, false]) {
  const { html, css } = renderTradeMap({ labels });
  const markup = `<style>${tradeMapStyles}${css}</style>${html}`;
  console.log(`Marcado de una instancia (labels=${labels}): ${kb(markup.length)} · gzip ${kb(gzipSync(markup, { level: 9 }).byteLength)}`);
}
