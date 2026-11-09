// Capturas de verificación del sitio compilado: abre dist/ con Chrome headless, recorre las secciones y guarda
// capturas/*.png. Avisa de errores de consola. Uso: npm run build && npm run captura
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = path.resolve('dist');
const BASE = '/propuesta_unit/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.stl': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith(BASE)) p = p.slice(BASE.length - 1);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.join(root, p);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}${BASE}`;

await mkdir('capturas', { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle0' });

const sections = ['inicio', 'estudio', 'alianza', 'shadows', 'audio-3d', 'praxi', 'praxi-3d', 'signage', 'letras-3d', 'pedimos', 'calendario'];
for (const id of sections) {
  await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: 'start' }), id);
  await new Promise((r) => setTimeout(r, id.endsWith('3d') || id === 'inicio' ? 4500 : 1200));
  await page.screenshot({ path: `capturas/${id}.png` });
  console.log('capturas/' + id + '.png');
}
// la mesa de audio en cada versión
for (let i = 0; i < 5; i++) {
  await page.evaluate((i) => { document.querySelectorAll('#version-tabs button')[i].click(); document.getElementById('audio-3d').scrollIntoView({ block: 'center' }); }, i);
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: `capturas/audio-v${i}.png` });
}
await page.evaluate(() => { document.getElementById('shadows-explode').value = '1'; document.getElementById('shadows-explode').dispatchEvent(new Event('input')); document.getElementById('shadows-3d').scrollIntoView({ block: 'center' }); });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: 'capturas/shadows-explode.png' });
await page.evaluate(() => { document.getElementById('letras-explode').value = '1'; document.getElementById('letras-explode').dispatchEvent(new Event('input')); document.getElementById('letras-3d').scrollIntoView({ block: 'center' }); document.getElementById('btn-mat-0').click(); });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: 'capturas/letras-explode.png' });

await browser.close();
server.close();
if (errors.length) { console.log('\nErrores de consola:'); for (const e of errors) console.log(' ·', e); process.exitCode = 1; }
else console.log('\nSin errores de consola.');
if (!existsSync('capturas/inicio.png')) process.exitCode = 1;
