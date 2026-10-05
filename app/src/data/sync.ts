import { planSync, type Delta, type Manifest, type ReleaseFile } from '@swept/core';
import { Directory, File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { applyDelta, dataInfo, replaceWith } from './db';

// Keeps the street data current without an app update. A weekly GitHub Action
// (.github/workflows/data.yml) publishes releases to the repo's `data` branch.

const BASE = 'https://raw.githubusercontent.com/Val0che/swept-parking/data/';
const CHECK_EVERY_MS = 24 * 3_600_000;
const LAST_CHECK_KEY = 'swept.data.lastCheck';

export type SyncResult = 'skipped' | 'current' | 'updated' | 'failed';

/** Download one release file and make sure it arrived intact. */
async function download(entry: ReleaseFile, into: Directory): Promise<File> {
  const file = await File.downloadFileAsync(BASE + entry.path, into);
  if (file.md5 !== entry.md5) throw new Error(`${entry.path}: checksum mismatch`);
  return file;
}

/**
 * Bring the database up to the latest release: a chain of small deltas when the
 * phone is a few versions behind, the full file otherwise. Checks at most once a
 * day unless `force`. Never throws: a failed sync leaves the current data in place.
 */
export async function syncData(force = false): Promise<SyncResult> {
  const last = Number(Storage.getItemSync(LAST_CHECK_KEY) ?? 0);
  if (!force && Date.now() - last < CHECK_EVERY_MS) return 'skipped';

  // Start-up hasn't opened the database yet: come back on the next visit.
  if (dataInfo().version < 0) return 'skipped';

  const scratch = new Directory(Paths.cache, 'swept-sync');
  try {
    const res = await fetch(`${BASE}manifest.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`manifest: HTTP ${res.status}`);
    const manifest = (await res.json()) as Manifest;
    const plan = planSync(manifest, dataInfo().version);

    if (plan.kind !== 'current') {
      if (scratch.exists) scratch.delete();
      scratch.create();
      if (plan.kind === 'deltas') {
        for (const entry of plan.deltas) {
          const file = await download(entry, scratch);
          applyDelta(JSON.parse(await file.text()) as Delta);
        }
      } else {
        replaceWith(await download(manifest.full, scratch));
      }
    }
    Storage.setItemSync(LAST_CHECK_KEY, String(Date.now()));
    return plan.kind === 'current' ? 'current' : 'updated';
  } catch {
    return 'failed';
  } finally {
    if (scratch.exists) scratch.delete();
  }
}
