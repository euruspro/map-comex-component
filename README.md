# @euruspro/map-comex-component

Mapa de comercio exterior de EURUS PRO®: Sudamérica (silueta continental, sin fronteras internas) con barcos, aviones y camiones que llegan a **puntos de aduana reales** y completan su trámite. En Chile y Colombia el nodo muestra el estado con la terminología del país ("DIN aceptada", "Levante autorizado"…); en los demás países confirma con un pulso.

- **Sin dependencias.** Núcleo en TypeScript que genera SVG + CSS como texto: sirve en el build (SSG/SSR) y en el navegador.
- **Rendimiento.** Lo fijo es un SVG que no se anima. Lo que se mueve son elementos HTML animados solo con `transform` y `opacity`, compuestos en GPU: ~0,1 % del hilo principal en desktop (el mismo mapa animado dentro del SVG usaba ~4,8 %).
- **Accesible.** Decorativo (`aria-hidden`). Se detiene con `prefers-reduced-motion`, se pausa fuera de pantalla y a pedido (WCAG 2.2.2).
- **CSP estricta.** Sin atributos `style` ni scripts inline; el Web Component usa `adoptedStyleSheets`.
- **Responsive.** El alto sale del ancho (5:6). Escenario de menos de 36rem: sin textos de estado. De menos de 30rem: fijo, sin vehículos.

Peso: Web Component completo 7,2 KB gzip; marcado de una instancia generado en el build 7,5 KB gzip (`npm run size`).

## Instalación (GitHub Packages)

El paquete es privado de la organización. En el proyecto que lo consume:

```ini
# .npmrc
@euruspro:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
NODE_AUTH_TOKEN=<token con read:packages> npm install --save-exact @euruspro/map-comex-component
```

- **Local:** un token clásico de GitHub con `read:packages` en la variable `NODE_AUTH_TOKEN`. Nunca en el repositorio.
- **GitHub Actions:** `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` con `permissions: packages: read`, y el repositorio consumidor habilitado en *Package settings → Manage Actions access*.
- **Otros CI (Cloudflare, Firebase…):** `NODE_AUTH_TOKEN` como secret del build.

## Uso

### Web Component (cualquier framework)

```ts
import '@euruspro/map-comex-component/define';
```

```html
<eurus-trade-map labels></eurus-trade-map>
```

| Atributo / propiedad | Efecto |
|---|---|
| `labels` | Muestra los estados aduaneros con texto. |
| `paused` / `.paused` | Pausa la animación (conéctalo a un botón "Pausar animación"). |

Sin efectos al importar: `import { defineTradeMap, EurusTradeMap } from '@euruspro/map-comex-component/element'`. Es seguro importarlo en el servidor (SSR).

En Vue, declara el elemento como personalizado (`compilerOptions.isCustomElement: (tag) => tag === 'eurus-trade-map'`).

### Generado en el build (0 KB de JS)

```ts
import { renderTradeMap, tradeMapStyles } from '@euruspro/map-comex-component';

const { html, css } = renderTradeMap({ labels: true, idPrefix: 'hero' });
// Insertar `<style>${tradeMapStyles}${css}</style>` y `html` en la página.
```

`idPrefix` debe ser distinto por instancia si hay más de un mapa en el mismo documento. Pausa: clase `tm-paused` en el escenario o en un ancestro. Fuera de pantalla: clase `is-offscreen` (la pone tu propio `IntersectionObserver`).

### Colores y tipografía

Variables CSS heredables, desde cualquier ancestro:

| Variable | Por defecto |
|---|---|
| `--tm-accent` | `#00BEE3` (cian de marca) |
| `--tm-surface` | `#001833` (tinta de marca) |
| `--tm-text` | `#FFFFFF` |
| `--tm-font` | la heredada |

Pensado para fondos oscuros de marca (hero del sitio, login de la app).

## Contenido del mapa

`src/network.ts` define los nodos (puertos, pasos fronterizos y aeropuertos reales) y las rutas (los barcos van por mar y los camiones por pasos reales). Es ilustrativo: **nunca datos de operaciones ni de clientes**. Los textos de estado se validan con Producto antes de cambiarlos.

La silueta sale de Natural Earth 1:50m (dominio público). Para regenerarla (solo si cambia la proyección):

```bash
curl -sSfL -o /tmp/land-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json
npm run geometry:build -- /tmp/land-50m.json
```

## Desarrollo

```bash
npm ci
npm run lint && npm run type-check && npm test && npm run size
```

Demo: `npm run build`, servir la raíz del repositorio con cualquier servidor estático y abrir `/demo/`.

## Publicar una versión

1. Subir `version` en `package.json` (semver) en un PR y hacer merge a `main`.
2. Crear el tag `vX.Y.Z` sobre ese commit. El workflow **Publicar en GitHub Packages** verifica que el tag coincida con la versión y publica. Las versiones con guion (`v0.2.0-beta.1`) salen con el dist-tag `next`.
