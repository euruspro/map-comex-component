<!--
  Copyright 2026 EURUS PRO SpA
  SPDX-License-Identifier: Apache-2.0

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# CLAUDE.md — euruspro/map-comex-component

Paquete público `@euruspro/map-comex-component` (npmjs.com): mapa de comercio exterior de EURUS PRO® como núcleo TypeScript sin dependencias + Web Component. Lo usan el sitio (`euruspro/website`, generado en el build) y la app (`euruspro/WebApp-2.0`, login). Detalle de uso en `README.md`.

## Reglas

- **Sin dependencias de runtime.** Solo `devDependencies`, con versiones exactas.
- **Rendimiento:** lo que se mueve son elementos HTML animados solo con `transform` y `opacity` (compuestos en GPU). Nada de animaciones dentro del SVG ni de propiedades que repinten (`stroke-dashoffset`, `filter`, colores). Medir antes y después con `npm run size` y una prueba de CPU.
- **CSP estricta:** sin atributos `style` ni scripts inline en el marcado generado (hay prueba).
- **Accesibilidad:** decorativo (`aria-hidden`); respeta `prefers-reduced-motion`; siempre pausable.
- **Contenido:** la red de `src/network.ts` es ilustrativa. Nunca datos de operaciones ni de clientes. Los textos de estado van solo en Chile y Colombia, con la terminología validada por Producto.
- **Colores:** solo los de marca como valores por defecto, siempre sobrescribibles con `--tm-*`.
- **ESM con extensión `.js` en los imports** (NodeNext). `src/projection.ts` no importa nada: lo usa también el generador de geometría.
- Identificadores en inglés y camelCase; comentarios y documentación en español neutral. Prohibido `any` sin justificación.

## Flujo

- Antes de cerrar: `npm run lint`, `npm run type-check` y `npm test`, sin errores ni warnings.
- Cambios de API pública: subir la versión según semver y documentarlos en `README.md`.
- Publicar (tag `vX.Y.Z`) requiere aprobación humana: es un release público que consumen el sitio y la app, y una versión publicada en npm no se puede reemplazar.
- Publicación por Trusted Publishing (OIDC, `publish.yml`). No agregar tokens de npm al repositorio ni a los workflows salvo el secret `NPM_TOKEN` de la primera versión.
