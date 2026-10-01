import { describe, expect, it } from 'vitest';
import { parseRule } from './parseRule';

const h = (hh: number, mm = 0) => hh * 60 + mm;
const APR1_DEC1 = { from: { month: 4, day: 1 }, to: { month: 12, day: 1 } };

describe('parseRule — cleaning signs', () => {
  it.each([
    ['\\P 8h30-11h30 MERCREDI 1 AVRIL AU 1 DEC', [3], [[h(8, 30), h(11, 30)]], APR1_DEC1],
    ['\\P 8h30-11h30 LUNDI 1AVRIL AU 1DEC', [1], [[h(8, 30), h(11, 30)]], APR1_DEC1],
    ['\\\\P 12h30-15h30 MERCREDI 1 AVRIL AU 1 DEC', [3], [[h(12, 30), h(15, 30)]], APR1_DEC1],
    ['\\P 13h-14h MAR. JEU. 1 MARS AU 1 DEC.', [2, 4], [[h(13), h(14)]], { from: { month: 3, day: 1 }, to: { month: 12, day: 1 } }],
    ['\\P 9H @ 12H MERCREDI 15 MARS AU 15 NOVEMBRE', [3], [[h(9), h(12)]], { from: { month: 3, day: 15 }, to: { month: 11, day: 15 } }],
    ['\\p 08h -12h mardi 1er mars - 1er déc', [2], [[h(8), h(12)]], { from: { month: 3, day: 1 }, to: { month: 12, day: 1 } }],
    ['\\P 8h - 12h JEUDI 1ER AVRIL - 30 NOV', [4], [[h(8), h(12)]], { from: { month: 4, day: 1 }, to: { month: 11, day: 30 } }],
    ['\\P 7h30-8h30 LUN A VEN 1 AVRIL AU 1 DEC', [1, 2, 3, 4, 5], [[h(7, 30), h(8, 30)]], APR1_DEC1],
    ['\\P 12h -16h JEUDI15 MARS AU 15 NOVEMBRE', [4], [[h(12), h(16)]], { from: { month: 3, day: 15 }, to: { month: 11, day: 15 } }],
    ['\\P 19h30-20h30 LUNDRI 1 AVRIL AU 1 DEC', [1], [[h(19, 30), h(20, 30)]], APR1_DEC1],
    ['\\P 6h30-7h30 LUNDI JEUDI 1 AVIL AU 1 DEC', [1, 4], [[h(6, 30), h(7, 30)]], APR1_DEC1],
    ['13H à 15H MERCREDI 15 MRS - 15 NOV. ENTRETIEN', [3], [[h(13), h(15)]], { from: { month: 3, day: 15 }, to: { month: 11, day: 15 } }],
    ['9H à 12H - LUNDI - 15 AVR au 15 NOV', [1], [[h(9), h(12)]], { from: { month: 4, day: 15 }, to: { month: 11, day: 15 } }],
    ['/P 19h-24h MARDI 1 AVRIL AU 1 DEC', [2], [[h(19), 0]], APR1_DEC1],
    ['\\P9h30-11h30 MARDI 1 AVRIL AU 1 DEC', [2], [[h(9, 30), h(11, 30)]], APR1_DEC1],
    ['\\P 9h-12h LUNDI JEUDI 1 AVRILAU 1 DEC', [1, 4], [[h(9), h(12)]], APR1_DEC1],
    ['AUTOCOL. \\P 8h30-9h30 LUN ET JEU 1 MARS AU 1 DEC.', [1, 4], [[h(8, 30), h(9, 30)]], { from: { month: 3, day: 1 }, to: { month: 12, day: 1 } }],
    ['\\P 8h à 12h du lundi au vendredi 1 avril au 30 nov. excepté véhicules municipaux', [1, 2, 3, 4, 5], [[h(8), h(12)]], { from: { month: 4, day: 1 }, to: { month: 11, day: 30 } }],
  ])('%s', (text, days, windows, season) => {
    const result = parseRule(text);
    expect(result).toEqual({
      ok: true,
      rule: {
        days,
        windows: windows.map(([start, end]) => ({ start, end })),
        season,
        kind: 'no-parking',
      },
    });
  });

  it('marks \\A signs as no-stopping', () => {
    const result = parseRule('\\A 7h - 8h MAR et JEU 1er AVRIL - 30 NOV');
    expect(result.ok && result.rule.kind).toBe('no-stopping');
    expect(result.ok && result.rule.days).toEqual([2, 4]);
  });

  it('keeps an overnight window on the day it starts', () => {
    const result = parseRule('\\P 23h30-00h30 LUN A MAR, JEU A VEN 1 MARS AU 1 DEC.');
    expect(result.ok && result.rule.days).toEqual([1, 4]);
    expect(result.ok && result.rule.windows).toEqual([{ start: h(23, 30), end: h(0, 30) }]);
  });

  it('does not collapse a weekday range with an overnight window', () => {
    const result = parseRule('\\P 23h30-0h30 LUN A VEN 1 AVRIL AU 1 DEC');
    expect(result.ok && result.rule.days).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('parseRule — rejected signs', () => {
  it.each([
    ['ANNULE \\P 09h-12h LUN. ET JEU. 1 MARS AU 1 DEC. ENTRETI', 'cancelled'],
    ['P 15 MIN.  7h-18h LUN A VEN SEPT. A JUIN', 'permission'],
    ['\\P EXCEPTE 8h - 12h MERCREDI 1er AVRIL - 30 NOV', 'inverted'],
    ['\\P EXCEPTÉ LUNDI 12H-16H 15 MARS AU 15 NOVEMBRE', 'inverted'],
    ['\\P 08h-17h LUN A VEN SEPT A JUIN', 'not-cleaning-season'],
    ['\\P 1 DEC AU 1 AVRIL', 'no-time'],
    ['\\P 8h-17h LUN A VEN 2 DEC AU 31 MARS', 'not-cleaning-season'],
    ['\\P EN TOUT TEMPS', 'no-time'],
  ])('%s → %s', (text, reason) => {
    expect(parseRule(text)).toEqual({ ok: false, reason });
  });
});
