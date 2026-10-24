// Screenshot and measure every [data-shot] element in design-sync/preview.html, dark and light.
// Setup (once, in any scratch folder): npm i playwright @fontsource/inter @fontsource/ibm-plex-mono @fontsource/dm-serif-display
// Run from that folder: node shot.mjs <path to preview.html> <outDir>
// Google Fonts are blocked and replaced with the same families from @fontsource so results do not depend on network access.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [page_, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const fs = p => 'file://' + resolve('node_modules/@fontsource', p);
const fontCss = [
  ['inter', 'Inter', [300, 400, 500, 600]], ['ibm-plex-mono', 'IBM Plex Mono', [400]], ['dm-serif-display', 'DM Serif Display', [400]],
].flatMap(([pkg, fam, ws]) => ws.map(w => `@font-face{font-family:'${fam}';font-weight:${w};src:url(${fs(`${pkg}/files/${pkg}-latin-${w}-normal.woff2`)}) format('woff2')}`)).join('\n');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' }).catch(() => chromium.launch());
const metrics = {};
for (const theme of ['dark', 'light']) {
  const p = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1200, height: 900 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + resolve(page_) + (theme === 'light' ? '?theme=light' : ''));
  await p.addStyleTag({ content: fontCss + '\n*{animation-play-state:paused!important;animation-delay:-0.19s!important}' });
  await p.evaluate(() => document.fonts.ready);
  for (const el of await p.$$('[data-shot]')) {
    const name = await el.getAttribute('data-shot');
    const target = await el.$(':scope > *');
    await target.screenshot({ path: `${out}/${name}-${theme}.png`, omitBackground: false });
    metrics[`${name}-${theme}`] = await target.evaluate(n => {
      const c = getComputedStyle(n), r = n.getBoundingClientRect();
      const kids = [...n.children].map(k => { const kc = getComputedStyle(k), kr = k.getBoundingClientRect(); return { cls: k.className, x: Math.round(kr.left - r.left), w: +kr.width.toFixed(1), h: +kr.height.toFixed(1), color: kc.color, font: kc.fontWeight + ' ' + kc.fontSize + '/' + kc.lineHeight }; });
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), padding: c.padding, gap: c.gap, radius: c.borderRadius, bg: c.backgroundColor, color: c.color, border: c.borderWidth + ' ' + c.borderColor + ' ' + c.borderTopColor, font: c.fontWeight + ' ' + c.fontSize + '/' + c.lineHeight + ' ' + c.fontFamily.split(',')[0], kids };
    });
  }
  await p.close();
}
await browser.close();
writeFileSync(`${out}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.keys(metrics).length, 'shots');
