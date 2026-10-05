import type { SideRow } from '../park/onParked';

// The street data is published by the weekly GitHub Action (pipeline/src/release.ts)
// to the repo's `data` branch, and synced by the app (app/src/data/sync.ts).

export interface ReleaseFile {
  path: string;
  md5: string;
  bytes: number;
}

export interface DeltaEntry extends ReleaseFile {
  /** Applies to a database at exactly this version… */
  from: number;
  /** …and brings it to this one. */
  to: number;
}

export interface Manifest {
  version: number;
  /** ISO date the city data was fetched. */
  builtAt: string;
  sides: number;
  /** The whole database, for phones too far behind for the deltas. */
  full: ReleaseFile;
  /** Consecutive deltas, oldest first. */
  deltas: DeltaEntry[];
}

/** A full `side` row, including the columns only the map needs. */
export interface SideRowFull extends SideRow {
  minlat: number;
  maxlat: number;
  minlng: number;
  maxlng: number;
  day: number | null;
  disputed: number;
}

/** Everything that changed between two releases. Applying it twice is harmless. */
export interface Delta {
  from: number;
  to: number;
  builtAt: string;
  /** Every rule the upserted rows reference. */
  rules: { id: number; json: string }[];
  upsert: SideRowFull[];
  remove: number[];
}

export type SyncPlan =
  | { kind: 'current' }
  | { kind: 'deltas'; deltas: DeltaEntry[] }
  | { kind: 'full' };

/**
 * What a phone at `localVersion` has to download: nothing, a chain of deltas, or
 * the full database when the chain doesn't reach back far enough (or the local
 * copy is an unreleased build, version 0).
 */
export function planSync(manifest: Manifest, localVersion: number): SyncPlan {
  if (localVersion >= manifest.version) return { kind: 'current' };
  const chain: DeltaEntry[] = [];
  let at = localVersion;
  while (at < manifest.version) {
    const next = manifest.deltas.find((d) => d.from === at);
    if (!next || next.to <= at) return { kind: 'full' };
    chain.push(next);
    at = next.to;
  }
  // A long chain of small files is still far cheaper than the 16 MB database.
  return at === manifest.version ? { kind: 'deltas', deltas: chain } : { kind: 'full' };
}
