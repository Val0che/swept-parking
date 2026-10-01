// Renders the app icon (brand direction 1a, "Nuit — un côté allumé") to the PNGs Expo needs.
// Geometry is the 168 pt mock in Swept.dc.html (#1a), scaled to 1024 px.
// Run: node design/icon/render.mjs   (uses Playwright's Chromium)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/assets');
const S = 1024;
const k = S / 168;

// Android adaptive icons are cropped to ~66% of the canvas; the street is shrunk to fit.
const A = 0.62;
const BG = 'linear-gradient(160deg,#353b80,#161826 85%)';

// Road band + two curbs, as percentages of a box. `scale` shrinks the drawing around the centre
// (Android adaptive icons are masked to a circle, so the street has to fit inside the safe zone).
function street({ scale = 1, band = true, west = '#595d6c', east = '#b5abfc', glow = true } = {}) {
  const px = (v) => v * k * scale;
  return `
  <div style="position:absolute;inset:0;transform:scale(${scale});transform-origin:50% 50%">
    ${band ? `<div style="position:absolute;left:30%;top:-5%;bottom:-5%;width:40%;background:rgba(233,233,237,.07)"></div>` : ''}
    <div style="position:absolute;left:30%;top:18%;bottom:18%;width:5%;border-radius:${4 * k}px;background:${west}"></div>
    <div style="position:absolute;right:29%;top:18%;bottom:18%;width:7%;border-radius:${6 * k}px;background:${east};
      ${glow ? `box-shadow:0 0 ${22 * k}px ${4 * k}px #9184d9` : ''}"></div>
  </div>`;
}

const page = (bg, body, size = S) => `<!doctype html><html><body style="margin:0;background:transparent">
  <div id="c" style="width:${size}px;height:${size}px;position:relative;overflow:hidden;background:${bg}">${body}</div>
  </body></html>`;

const jobs = [
  // iOS masks the corners itself; the icon must be square and opaque.
  { file: 'icon.png', html: page(BG, street()) },
  // Android: the road band lives in the full-bleed background layer, lined up with the scaled curbs.
  {
    file: 'android-icon-background.png',
    html: page(BG, `<div style="position:absolute;left:${50 - 20 * A}%;top:0;bottom:0;width:${40 * A}%;background:rgba(233,233,237,.07)"></div>`),
  },
  { file: 'android-icon-foreground.png', transparent: true, html: page('transparent', street({ scale: A, band: false })) },
  {
    file: 'android-icon-monochrome.png',
    transparent: true,
    html: page('transparent', street({ scale: A, band: false, west: 'rgba(255,255,255,.45)', east: '#fff', glow: false })),
  },
  { file: 'splash-icon.png', transparent: true, html: page('transparent', street({ band: false })) },
  { file: 'favicon.png', html: page(BG, street()), size: 48 },
];

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: S, height: S } });
for (const job of jobs) {
  await p.setContent(job.html);
  const shot = await p.locator('#c').screenshot({ omitBackground: !!job.transparent });
  if (job.size) {
    // Downscale in the browser so the small favicon stays crisp.
    const data = shot.toString('base64');
    await p.setContent(`<body style="margin:0"><img id="c" src="data:image/png;base64,${data}" style="width:${job.size}px;height:${job.size}px"></body>`);
    await p.locator('#c').screenshot({ path: path.join(out, job.file) });
  } else {
    await writeFile(path.join(out, job.file), shot);
  }
  console.log('wrote', job.file);
}
await browser.close();
