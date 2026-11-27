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
 * Red ilustrativa del mapa: puntos de aduana reales y rutas plausibles (los barcos van por mar,
 * los camiones por pasos fronterizos reales). No son datos de operaciones ni de clientes.
 *
 * Alcance continental (decisión 2026-11-26). Los estados con texto solo aparecen en Chile y
 * Colombia, con la terminología de cada país (skill eurus-brand → Terminología, a validar con
 * Producto). En los demás países el nodo confirma con un pulso, sin texto.
 */
import type { LonLat } from './projection.js';

export type TransportMode = 'sea' | 'air' | 'land';
export type FlowDirection = 'import' | 'export';
export type CountryCode = 'CL' | 'CO' | 'PE' | 'BR' | 'AR' | 'EC' | 'BO';

export interface CustomsNode {
  readonly id: string;
  readonly name: string;
  readonly country: CountryCode;
  readonly at: LonLat;
  /** Lado donde aparece el estado, para no tapar la ruta ni salirse del lienzo. */
  readonly labelSide: 'left' | 'right';
}

export interface TradeRoute {
  readonly id: string;
  readonly mode: TransportMode;
  readonly direction: FlowDirection;
  readonly nodeId: string;
  /**
   * Recorrido en lon/lat. Importación: desde el origen hasta el nodo (el nodo se agrega solo).
   * Exportación: desde el nodo hacia el destino (el nodo se antepone solo).
   */
  readonly waypoints: readonly LonLat[];
  /** Estado que muestra el nodo al completarse el trámite (solo CL y CO). */
  readonly status?: string;
  /** 1: siempre; 2: se oculta en pantallas angostas para no saturar. */
  readonly priority: 1 | 2;
}

export const customsNodes: readonly CustomsNode[] = [
  { id: 'sanAntonio', name: 'Puerto San Antonio', country: 'CL', at: [-71.62, -33.59], labelSide: 'left' },
  { id: 'losLibertadores', name: 'Paso Los Libertadores', country: 'CL', at: [-70.07, -32.83], labelSide: 'right' },
  { id: 'arica', name: 'Puerto de Arica', country: 'CL', at: [-70.32, -18.48], labelSide: 'right' },
  { id: 'buenaventura', name: 'Puerto de Buenaventura', country: 'CO', at: [-77.07, 3.88], labelSide: 'left' },
  { id: 'cartagena', name: 'Puerto de Cartagena', country: 'CO', at: [-75.53, 10.4], labelSide: 'right' },
  { id: 'bogota', name: 'Aeropuerto El Dorado', country: 'CO', at: [-74.14, 4.7], labelSide: 'right' },
  { id: 'rumichaca', name: 'Puente de Rumichaca', country: 'CO', at: [-77.64, 0.81], labelSide: 'left' },
  { id: 'callao', name: 'Puerto del Callao', country: 'PE', at: [-77.15, -12.05], labelSide: 'left' },
  { id: 'santos', name: 'Puerto de Santos', country: 'BR', at: [-46.3, -23.96], labelSide: 'right' },
  { id: 'ezeiza', name: 'Aeropuerto de Ezeiza', country: 'AR', at: [-58.54, -34.82], labelSide: 'right' },
];

export const tradeRoutes: readonly TradeRoute[] = [
  {
    id: 'asiaSanAntonio',
    mode: 'sea',
    direction: 'import',
    nodeId: 'sanAntonio',
    waypoints: [[-108, -37], [-90, -35.5], [-74, -33.8]],
    status: 'DIN aceptada',
    priority: 1,
  },
  {
    id: 'pacificBuenaventura',
    mode: 'sea',
    direction: 'import',
    nodeId: 'buenaventura',
    waypoints: [[-104, 9], [-88, 5.5], [-78.6, 3.7]],
    status: 'Levante autorizado',
    priority: 1,
  },
  {
    id: 'mendozaLibertadores',
    mode: 'land',
    direction: 'import',
    nodeId: 'losLibertadores',
    waypoints: [[-58.6, -34.6], [-61.5, -33.6], [-64.3, -33.1], [-66.8, -33.3], [-68.8, -32.9]],
    status: 'Retiro autorizado',
    priority: 1,
  },
  {
    id: 'caribbeanCartagena',
    mode: 'sea',
    direction: 'import',
    nodeId: 'cartagena',
    waypoints: [[-73.6, 24], [-73.9, 19.8], [-75.6, 14.5], [-75.9, 11.2]],
    status: 'Declaración aceptada',
    priority: 1,
  },
  {
    id: 'miamiBogota',
    mode: 'air',
    direction: 'import',
    nodeId: 'bogota',
    waypoints: [[-80.3, 27]],
    status: 'Levante autorizado',
    priority: 1,
  },
  {
    id: 'atlanticSantos',
    mode: 'sea',
    direction: 'import',
    nodeId: 'santos',
    waypoints: [[-18, -30], [-34, -27], [-45.6, -24.4]],
    priority: 1,
  },
  {
    id: 'aricaAsia',
    mode: 'sea',
    direction: 'export',
    nodeId: 'arica',
    waypoints: [[-72, -19.2], [-88, -21.5], [-110, -24]],
    status: 'DUS legalizado',
    priority: 2,
  },
  {
    id: 'europeEzeiza',
    mode: 'air',
    direction: 'import',
    nodeId: 'ezeiza',
    waypoints: [[-12, 8]],
    priority: 2,
  },
  {
    id: 'pacificCallao',
    mode: 'sea',
    direction: 'import',
    nodeId: 'callao',
    waypoints: [[-106, -15], [-90, -13], [-77.6, -12.1]],
    priority: 2,
  },
  {
    id: 'guayaquilRumichaca',
    mode: 'land',
    direction: 'import',
    nodeId: 'rumichaca',
    waypoints: [[-79.9, -2.2], [-79.2, -1.5], [-78.5, -0.2], [-77.9, 0.4]],
    // Sin texto: coincide en pantalla con el estado de Buenaventura.
    priority: 2,
  },
];
