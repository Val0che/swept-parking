import { describe, expect, it } from 'vitest';
import { planSync, type Manifest } from './release';

const file = (path: string) => ({ path, md5: 'x', bytes: 1 });
const manifest: Manifest = {
  version: 7,
  builtAt: '2026-10-05T09:00:00Z',
  sides: 91562,
  full: file('sides.db'),
  deltas: [
    { from: 4, to: 5, ...file('deltas/4-5.json') },
    { from: 5, to: 6, ...file('deltas/5-6.json') },
    { from: 6, to: 7, ...file('deltas/6-7.json') },
  ],
};

describe('planSync', () => {
  it('does nothing when up to date (or ahead)', () => {
    expect(planSync(manifest, 7)).toEqual({ kind: 'current' });
    expect(planSync(manifest, 8)).toEqual({ kind: 'current' });
  });

  it('chains the deltas from the local version', () => {
    const plan = planSync(manifest, 5);
    expect(plan.kind === 'deltas' && plan.deltas.map((d) => d.path)).toEqual(['deltas/5-6.json', 'deltas/6-7.json']);
  });

  it('falls back to the full database when the chain does not reach back', () => {
    expect(planSync(manifest, 2)).toEqual({ kind: 'full' });
  });

  it('downloads the full database over an unreleased local build', () => {
    expect(planSync(manifest, 0)).toEqual({ kind: 'full' });
  });

  it('falls back when a delta is missing from the middle of the chain', () => {
    const gap = { ...manifest, deltas: manifest.deltas.filter((d) => d.from !== 5) };
    expect(planSync(gap, 4)).toEqual({ kind: 'full' });
  });
});
