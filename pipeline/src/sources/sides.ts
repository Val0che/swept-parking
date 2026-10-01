import { readFile } from 'node:fs/promises';
import { cachePath } from './urls';

import type { LngLat } from '@swept/core';

export type { LngLat };

/** One side of one block, from the Géobase double. */
export interface StreetSide {
  id: number; // COTE_RUE_ID
  segmentId: number; // ID_TRC, shared by both sides of the block
  street: string; // "avenue Adhémar-Mailhiot"
  side: 'left' | 'right'; // relative to the segment's digitised direction
  /** 0 = two-way; ±1 = one-way along / against the digitised direction. */
  oneWay: -1 | 0 | 1;
  addresses: [number, number];
  line: LngLat[];
}

interface Feature {
  geometry: { type: 'LineString' | 'MultiLineString'; coordinates: unknown } | null;
  properties: {
    COTE_RUE_ID: number;
    ID_TRC: number;
    NOM_VOIE: string;
    TYPE_F: string | null;
    COTE: 'Gauche' | 'Droite';
    SENS_CIR: number;
    DEBUT_ADRESSE: number;
    FIN_ADRESSE: number;
  };
}

export async function loadSides(): Promise<StreetSide[]> {
  const { features } = JSON.parse(await readFile(cachePath('sides'), 'utf8')) as { features: Feature[] };
  const sides: StreetSide[] = [];
  for (const { geometry, properties: p } of features) {
    if (!geometry) continue;
    const line =
      geometry.type === 'LineString'
        ? (geometry.coordinates as LngLat[])
        : (geometry.coordinates as LngLat[][]).flat();
    if (line.length < 2) continue;
    sides.push({
      id: p.COTE_RUE_ID,
      segmentId: p.ID_TRC,
      street: [p.TYPE_F, p.NOM_VOIE].filter(Boolean).join(' '),
      side: p.COTE === 'Gauche' ? 'left' : 'right',
      oneWay: Math.sign(p.SENS_CIR) as -1 | 0 | 1,
      addresses: [p.DEBUT_ADRESSE, p.FIN_ADRESSE],
      line,
    });
  }
  return sides;
}
