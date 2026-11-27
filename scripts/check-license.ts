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
 * Cumplimiento de la licencia (Apache-2.0):
 * - cada archivo versionado lleva el aviso de copyright y el identificador SPDX, salvo los que no
 *   admiten comentarios (JSON de npm) o son la propia licencia;
 * - LICENSE (texto canónico) y NOTICE existen, y package.json declara Apache-2.0 y publica NOTICE;
 * - si hay build, cada archivo de dist/ conserva el aviso (tsc mantiene los comentarios /*!).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const COPYRIGHT = 'Copyright 2026 EURUS PRO SpA';
const SPDX = 'SPDX-License-Identifier: Apache-2.0';
/** Sin comentarios posibles o con su propio régimen: se validan aparte. */
const EXEMPT = new Set(['LICENSE', 'NOTICE', 'package.json', 'package-lock.json', 'README.md']);

const problems: string[] = [];

let tracked: string[];
try {
  tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch (error) {
  console.error('check-license: no se pudo listar los archivos con git:', error);
  process.exit(1);
}

for (const file of tracked) {
  if (EXEMPT.has(file)) continue;
  const content = readFileSync(file, 'utf8');
  if (!content.includes(COPYRIGHT) || !content.includes(SPDX)) problems.push(`${file}: falta el aviso de licencia`);
}

const license = existsSync('LICENSE') ? readFileSync('LICENSE', 'utf8') : '';
if (!license.includes('Apache License') || !license.includes('Version 2.0, January 2004')) {
  problems.push('LICENSE: no es el texto de la Apache License 2.0');
}
const notice = existsSync('NOTICE') ? readFileSync('NOTICE', 'utf8') : '';
if (!notice.includes(COPYRIGHT)) problems.push('NOTICE: falta o no tiene el aviso de copyright');
if (!notice.includes('Natural Earth') || !notice.includes('Michael Bostock')) {
  problems.push('NOTICE: faltan las atribuciones de terceros (Natural Earth, world-atlas)');
}
if (!readFileSync('README.md', 'utf8').includes('Apache-2.0')) problems.push('README.md: falta la sección de licencia');

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { license?: string; files?: string[] };
if (pkg.license !== 'Apache-2.0') problems.push('package.json: "license" debe ser "Apache-2.0"');
if (!pkg.files?.includes('NOTICE')) problems.push('package.json: "files" debe incluir NOTICE');

if (existsSync('dist')) {
  for (const file of readdirSync('dist').filter((name) => name.endsWith('.js'))) {
    const content = readFileSync(join('dist', file), 'utf8');
    if (!content.includes(SPDX)) problems.push(`dist/${file}: el build perdió el aviso de licencia`);
  }
}

if (problems.length > 0) {
  console.error(`check-license: ${problems.length} problema(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-license: OK (${tracked.length} archivos versionados revisados).`);
