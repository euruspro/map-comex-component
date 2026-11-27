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
 * Verifica que el tarball publicable solo contenga dist/** y los metadatos (package.json,
 * README.md, LICENSE, NOTICE). Falla si se cuela cualquier otra cosa: credenciales del runner,
 * fuentes, configuración.
 *
 * La allowlist es INDEPENDIENTE del campo "files" de package.json a propósito (mismo criterio que
 * euruspro/utils): "files" controla el empaquetado y esto es una segunda barrera que falla aunque
 * "files" quede mal configurado. Ampliar "files" obliga a actualizar ALLOWED_ROOT_FILES aquí.
 * Lo usan CI y el workflow de publicación.
 */
import { execFileSync } from 'node:child_process';

const ALLOWED_ROOT_FILES = new Set(['package.json', 'README.md', 'LICENSE', 'NOTICE']);
const isAllowed = (path: string): boolean => path.startsWith('dist/') || ALLOWED_ROOT_FILES.has(path);

let files: string[];
try {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' });
  const [pack] = JSON.parse(output) as { files: { path: string }[] }[];
  if (pack === undefined) throw new Error('npm pack no devolvió resultados.');
  files = pack.files.map((file) => file.path);
} catch (error) {
  console.error('verify-tarball: no se pudo simular el empaquetado:', error);
  process.exit(1);
}

const offenders = files.filter((path) => !isAllowed(path));
if (offenders.length > 0) {
  console.error(`::error::El tarball incluye archivos no permitidos:\n- ${offenders.join('\n- ')}`);
  process.exit(1);
}
if (!files.includes('NOTICE') || !files.includes('LICENSE')) {
  console.error('::error::El tarball debe incluir LICENSE y NOTICE (Apache-2.0, sección 4).');
  process.exit(1);
}
console.log(`verify-tarball: OK (${files.length} archivos).`);
