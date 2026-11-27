/**
 * Glifos de los vehículos (24×24, trazo) y del check de estado. Dibujados para el mapa: de perfil,
 * sin rotar, para que se reconozcan a 14 px dentro de la insignia circular.
 */
import type { TransportMode } from './network.js';

export const vehicleGlyphs: Readonly<Record<TransportMode, string>> = {
  // Portacontenedores: casco, tres pilas de contenedores y puente.
  sea: 'M2.5 14.5h19l-3 5h-13zM5.5 14.5V11H9v3.5M9 14.5V8.5h3.5v6M12.5 14.5V11H16v3.5M17.5 14.5V7.5h2v7',
  // Avión de carga visto desde arriba, apuntando hacia arriba.
  air: 'M12 2.5c.9 0 1.4.8 1.4 1.8v5.4l7.6 4.5v2.1l-7.6-2.4v4.3l2.3 1.7v1.6L12 20.4l-3.7 1.1v-1.6l2.3-1.7v-4.3L3 16.3v-2.1l7.6-4.5V4.3c0-1 .5-1.8 1.4-1.8z',
  // Camión con remolque, de perfil.
  land: 'M2.5 6.5h11v10h-11zM13.5 10h4l3.5 3.5v3h-7.5M5 19.2a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0M15 19.2a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0',
};

export const checkGlyph = 'M8 12.5l2.6 2.6L16 9.6';
