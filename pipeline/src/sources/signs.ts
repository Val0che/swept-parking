import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { cachePath } from './urls';

/** One sign panel. Several panels hang on the same pole (`poleId`). */
export interface SignPanel {
  poleId: string;
  text: string;
  /** 0 = no arrow, 2 = left, 3 = right, 8 = both (per city data). */
  arrow: number;
  lng: number;
  lat: number;
  borough: string;
}

export async function loadSigns(): Promise<SignPanel[]> {
  const rows: Record<string, string>[] = parse(await readFile(cachePath('signs')), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });
  return rows
    .map((r) => ({
      poleId: r.POTEAU_ID_POT!,
      text: r.DESCRIPTION_RPA ?? '',
      arrow: Number(r.FLECHE_PAN || 0),
      lng: Number(r.Longitude),
      lat: Number(r.Latitude),
      borough: r.NOM_ARROND ?? '',
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0);
}
