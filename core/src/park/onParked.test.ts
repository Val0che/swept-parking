import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDERS } from '../home/reminders';
import { parseRule } from '../rules/parseRule';
import { onParked, type ParkedInput, type SideRow } from './onParked';

const json = (text: string) => {
  const r = parseRule(text);
  if (!r.ok) throw new Error(text);
  return JSON.stringify(r.rule);
};

// avenue Coloniale 3817–3935 as it is in sides.db: east = Friday (4 poles 15:30, 1 pole 15:00), west = Wednesday.
const ruleJson = {
  1: json('\\P 15h30-16h30 VENDREDI 1 AVRIL AU 1 DEC'),
  2: json('\\P 15h-16h VENDREDI 1 AVRIL AU 1 DEC'),
  3: json('\\P 13h-14h MERCREDI 1 AVRIL AU 1 DEC'),
};
const row = (id: number, grid: string, line: number[][], rules: string | null): SideRow => ({
  id,
  seg: 1250050,
  street: 'avenue Coloniale',
  grid,
  a1: 3817,
  a2: 3935,
  oneway: 1,
  line: JSON.stringify(line),
  rules,
});
const EAST = row(12500501, 'east', [[-73.577051, 45.517252], [-73.57515, 45.516383]], '1:4,2:1');
const WEST = row(12500502, 'west', [[-73.575182, 45.516303], [-73.577107, 45.517191]], '3:5');

const input = (over: Partial<ParkedInput> = {}): ParkedInput => ({
  lat: 45.517151, // sign pole 15975, on the east sidewalk
  lng: -73.576765,
  accuracy: 5,
  now: new Date('2026-09-30T14:10').getTime(), // Wednesday, after the west side's window
  lang: 'fr',
  settings: DEFAULT_REMINDERS,
  source: 'auto',
  rows: [WEST, EAST],
  ruleJson,
  ...over,
});
const at = (ms: number | null) => (ms === null ? 'now' : new Date(ms).toString().slice(0, 21));

describe('onParked', () => {
  it('records the nearest side and offers to switch', () => {
    const { spot, notifications } = onParked(input());
    expect(spot).toMatchObject({ sideId: 12500501, side: 'east', street: 'avenue Coloniale', oppositeDay: 3 });
    expect(spot?.unconfirmed).toBeUndefined();
    expect(notifications[0]).toMatchObject({
      id: 'swept.parked',
      at: null,
      category: 'parked',
      title: "Garée sur l'avenue Coloniale, côté est ?",
      body: 'Nettoyage ven. 15 h 30. Confirmez ou changez de côté.',
    });
  });

  it('plans evening, lead and move-now for 8 Fridays, timed on the earliest sign', () => {
    const { notifications } = onParked(input());
    const reminders = notifications.slice(1);
    expect(reminders).toHaveLength(24);
    expect(reminders.slice(0, 3).map((n) => [n.id, at(n.at), n.title])).toEqual([
      ['swept.reminder.evening.0', 'Thu Oct 01 2026 20:00', 'Demain 15 h 00 · Coloniale, côté est'],
      ['swept.reminder.lead.0', 'Fri Oct 02 2026 14:00', 'Nettoyage dans 1 h'],
      ['swept.reminder.now.0', 'Fri Oct 02 2026 15:00', 'Le nettoyage a commencé'],
    ]);
    expect(reminders[0]!.body).toBe(
      'Déplacez votre voiture avant 15 h 00 demain.\nUn panneau ici indique 15 h 00 (les autres, 15 h 30) — rappel réglé sur 15 h 00.',
    );
    expect(reminders[1]!.body.split('\n')[0]).toBe('Avenue Coloniale, côté est. Déplacez votre voiture avant 15 h 00.');
    expect(reminders[2]).toMatchObject({ category: 'moveNow', timeSensitive: true });
  });

  it('asks which side only when the fix is very loose, and then covers both sides until answered', () => {
    const { spot, notifications } = onParked(input({ accuracy: 60 }));
    expect(spot?.unconfirmed).toMatchObject({ otherSideId: 12500502, otherSide: 'west' });
    expect(notifications[0]).toMatchObject({
      category: 'parkedAmbiguousEW',
      title: "De quel côté de l'avenue Coloniale ?",
      data: { sideId: 12500501, sides: { east: 12500501, west: 12500502 } },
    });
    // Friday (east) and next Wednesday (west) are both covered.
    const starts = notifications.filter((n) => n.category === 'moveNow').map((n) => at(n.at));
    expect(starts.slice(0, 2)).toEqual(['Fri Oct 02 2026 15:00', 'Wed Oct 07 2026 13:00']);
  });

  it('offers to add a schedule where the city has no sign', () => {
    const bare = { ...EAST, street: 'rue Galt', rules: null };
    const { spot, notifications } = onParked(input({ rows: [bare] }));
    expect(spot?.schedule.rules).toEqual([]);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ category: 'parkedNoData', title: 'Garée sur la rue Galt, côté est' });
  });

  it('does nothing away from any street', () => {
    expect(onParked(input({ lat: 45.6, lng: -73.7 }))).toEqual({ spot: null, notifications: [] });
  });

  it('speaks English', () => {
    const { notifications } = onParked(input({ lang: 'en' }));
    expect(notifications[0]).toMatchObject({
      title: 'Parked on avenue Coloniale, east side?',
      body: 'Cleaning Fri 15:30. Confirm or switch sides.',
    });
    expect(notifications[1]!.title).toBe('Tomorrow 15:00 · Coloniale, east side');
  });
});
