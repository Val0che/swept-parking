/**
 * Canonical form of a sign's `DESCRIPTION_RPA` text: upper case, no accents,
 * single spaces, and the common typos and glued words in the city data fixed.
 */
export function normalize(raw: string): string {
  return (
    raw
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      // "\\P", "/P" and "\P9h30" all mean the no-parking symbol.
      .replace(/^[\\/]+([PA])(?=\s|\d)/, '\\$1 ')
      .replace(/\bAUTOCOL\.?\s*/, '')
      // Typos seen in the data.
      .replace(/\bLUNDRI\b/g, 'LUNDI')
      .replace(/\bAVIL\b/g, 'AVRIL')
      .replace(/\bMRS\b/g, 'MARS')
      // Glued tokens: "JEUDI15 MARS", "1AVRIL", "AVRILAU", "1DEC".
      .replace(/([A-GI-Z])(\d)/g, '$1 $2')
      .replace(/(\d)(ER)?(?=[A-GI-Z])/g, '$1$2 ')
      .replace(/\bAVRILAU\b/g, 'AVRIL AU')
      .replace(/(\d)\s+ER\b/g, '$1ER')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
