import { parseRule } from '@swept/core';
import { loadSigns } from '../sources/signs';

/**
 * How many sign panels that *look* like cleaning (weekday + month) the parser
 * understands, and what the rest are. Run: `pnpm tsx src/reports/coverage.ts`.
 */
const LOOKS_LIKE_CLEANING = /\b(LUN|MAR|MER|JEU|VEN|SAM|DIM)/i;
const HAS_MONTH = /(JANV|FEV|MARS|MRS|AVR|AVIL|MAI|JUIN|JUIL|AOUT|SEPT|OCT|NOV|DEC)/i;

const panels = (await loadSigns()).filter(
  (p) => LOOKS_LIKE_CLEANING.test(p.text) && HAS_MONTH.test(p.text),
);

const reasons = new Map<string, number>();
const unparsed = new Map<string, number>();
let ok = 0;
for (const p of panels) {
  const result = parseRule(p.text);
  if (result.ok) {
    ok++;
    continue;
  }
  reasons.set(result.reason, (reasons.get(result.reason) ?? 0) + 1);
  if (result.reason === 'no-time' || result.reason === 'no-day' || result.reason === 'no-season') {
    unparsed.set(p.text, (unparsed.get(p.text) ?? 0) + 1);
  }
}

console.log(`candidate panels: ${panels.length}`);
console.log(`parsed as cleaning: ${ok} (${((ok / panels.length) * 100).toFixed(1)}%)`);
console.log('rejected:', Object.fromEntries(reasons));
console.log('\nunparsed texts (might be cleaning):');
for (const [text, n] of [...unparsed].sort((a, b) => b[1] - a[1])) console.log(`${n}\t${text}`);
