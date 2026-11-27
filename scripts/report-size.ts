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
