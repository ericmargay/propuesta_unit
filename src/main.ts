import './style.css';
import { VERSIONS } from './data/versions';
import { SHADOWS_BOM, PRAXI_BOM, PRAXI_SERVICES, SIGNAGE_BOM, SIGNAGE_SERVICES, groupTotal, unionTotal, mxn, type BomGroup } from './data/bom';
import { SEQUENCES } from './three/engine';
import type { ShadowsScene } from './three/shadows';
import type { AudioBench } from './three/audio';
import type { PraxiScene } from './three/praxi';
import type { LettersScene } from './three/letras';

const BASE = import.meta.env.BASE_URL;
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

// ---------------------------------------------------------------- navegación y revelado
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });
const navLinks = [...nav.querySelectorAll<HTMLAnchorElement>('li a')];
const sectionSpy = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    const id = `#${e.target.id}`;
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
for (const a of navLinks) {
  const s = document.querySelector<HTMLElement>(a.getAttribute('href')!);
  if (s) sectionSpy.observe(s);
}

const reveal = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));

// ---------------------------------------------------------------- escenas (se cargan al acercarse)
const scenes: { shadows?: ShadowsScene; hero?: ShadowsScene; audio?: AudioBench; praxi?: PraxiScene; letras?: LettersScene } = {};

function loading(el: HTMLElement, on: boolean): void {
  let l = el.querySelector<HTMLElement>('.scene-loading');
  if (on && !l) { l = document.createElement('div'); l.className = 'scene-loading'; l.textContent = 'cargando el modelo…'; el.appendChild(l); }
  if (!on && l) l.remove();
}

const mounted = new WeakSet<Element>();
const mounter = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting || mounted.has(e.target)) continue;
    mounted.add(e.target);
    mounter.unobserve(e.target);
    void mount(e.target as HTMLElement);
  }
}, { rootMargin: '400px 0px' });
document.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => mounter.observe(el));

async function mount(el: HTMLElement): Promise<void> {
  const kind = el.dataset.scene!;
  loading(el, true);
  try {
    if (kind === 'shadows-hero' || kind === 'shadows') {
      const { ShadowsScene } = await import('./three/shadows');
      const s = new ShadowsScene(el, { hero: kind === 'shadows-hero' });
      if (kind === 'shadows') { scenes.shadows = s; wireShadows(s); } else { scenes.hero = s; s.setSequence(SEQUENCES[3]); }
    } else if (kind === 'audio') {
      const { AudioBench } = await import('./three/audio');
      scenes.audio = new AudioBench(el);
      scenes.audio.setVersion(VERSIONS[currentVersion]);
    } else if (kind === 'praxi') {
      const { PraxiScene } = await import('./three/praxi');
      const p = new PraxiScene(el, BASE);
      scenes.praxi = p;
      $<HTMLInputElement>('#praxi-explode').addEventListener('input', (ev) => p.setExplode(parseFloat((ev.target as HTMLInputElement).value)));
      await p.ready;
    } else if (kind === 'letras') {
      const { LettersScene } = await import('./three/letras');
      const l = new LettersScene(el);
      scenes.letras = l;
      $('#btn-mat-0').addEventListener('click', () => l.stepOnMat(0));
      $('#btn-mat-1').addEventListener('click', () => l.stepOnMat(1));
      document.querySelectorAll<HTMLButtonElement>('[data-pad]').forEach((b) => b.addEventListener('click', () => l.touchPad(b.dataset.pad!)));
      $<HTMLInputElement>('#letras-explode').addEventListener('input', (ev) => l.setExplode(parseFloat((ev.target as HTMLInputElement).value)));
    }
  } catch (err) {
    console.error(err);
    const l = el.querySelector<HTMLElement>('.scene-loading');
    if (l) { l.textContent = 'este navegador no pudo abrir el modelo 3D'; return; }
  }
  loading(el, false);
}

function wireShadows(s: ShadowsScene): void {
  const sel = $<HTMLSelectElement>('#seq-select');
  SEQUENCES.forEach((q, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = q.name; sel.appendChild(o); });
  sel.addEventListener('change', () => s.setSequence(SEQUENCES[parseInt(sel.value)]));
  $<HTMLInputElement>('#shadows-explode').addEventListener('input', (ev) => s.setExplode(parseFloat((ev.target as HTMLInputElement).value)));
  const bar = $('#shadows-time');
  setInterval(() => { bar.style.width = `${(s.time / s.seq.duration) * 100}%`; }, 120);
}

// ---------------------------------------------------------------- versiones de audio
let currentVersion = 0;
const tabs = $('#version-tabs');
const info = $('#version-info');
VERSIONS.forEach((v, i) => {
  const b = document.createElement('button');
  b.textContent = v.short;
  b.dataset.v = v.id;
  b.title = v.name;
  b.addEventListener('click', () => selectVersion(i));
  tabs.appendChild(b);
});
function selectVersion(i: number): void {
  currentVersion = i;
  const v = VERSIONS[i];
  tabs.querySelectorAll('button').forEach((b, k) => b.classList.toggle('active', k === i));
  info.innerHTML = `<h3>${v.name}</h3><div class="meta"><span>Sincronía <b>${v.sync}</b></span><span>Latencia <b>${v.latency}</b></span><span class="state-pill${i === 0 ? ' ok' : ''}">${v.status}</span></div><p class="muted">${v.summary}</p>`;
  scenes.audio?.setVersion(v);
  document.querySelectorAll<HTMLElement>('#bom-shadows [data-group]').forEach((g) => g.classList.toggle('accent', g.dataset.group === v.id));
}
selectVersion(0);

// ---------------------------------------------------------------- listas de piezas
function bomTable(g: BomGroup): string {
  const rows = g.items.map((i) => {
    const tag = i.alt ? '' : i.unit ? `<a class="tag ok" href="${i.unit}" target="_blank" rel="noopener">ficha UNIT</a>` : i.outside ? '<span class="tag out">fuera de UNIT</span>' : '<span class="tag">buscar en tienda</span>';
    return `<tr class="${i.alt ? 'alt' : ''}"><td>${i.name}${tag}${i.note ? `<span class="note">${i.note}</span>` : ''}</td><td class="num">${i.alt ? '—' : i.qty}</td><td class="num">${i.price === null ? 'por cotizar' : i.price}</td><td class="num">${i.alt || i.price === null ? '—' : i.qty * i.price}</td></tr>`;
  }).join('');
  const note = g.note ? `<span class="note" style="font-family:var(--font);font-weight:400;font-size:13px;margin-top:4px">${g.note}</span>` : '';
  const body = g.items.length ? `${rows}<tr class="total"><td colspan="3">Subtotal</td><td class="num">${mxn(groupTotal(g))}</td></tr>` : '<tr class="total"><td colspan="3">Sin piezas nuevas</td><td class="num">MXN 0</td></tr>';
  return `<div class="table-wrap card" data-group="${g.id}" style="padding:0;margin-bottom:14px"><table><caption>${g.title}${note}</caption><thead><tr><th>Pieza</th><th class="num">Cant.</th><th class="num">c/u</th><th class="num">MXN</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function servicesTable(title: string, rows: Array<{ name: string; detail: string; estimate: number | null; unitService: string }>): string {
  const body = rows.map((r) => `<tr><td>${r.name}<span class="note">${r.detail}</span></td><td>${r.unitService}</td><td class="num">${r.estimate === null ? 'por cotizar' : mxn(r.estimate)}</td></tr>`).join('');
  const total = rows.reduce((a, r) => a + (r.estimate ?? 0), 0);
  return `<div class="table-wrap card" style="padding:0"><table><caption>${title}</caption><thead><tr><th>Trabajo</th><th>Con quién</th><th class="num">Estimado en taller</th></tr></thead><tbody>${body}${total ? `<tr class="total"><td colspan="2">Referencia de taller externo (CDMX)</td><td class="num">${mxn(total)}</td></tr>` : ''}</tbody></table></div>`;
}

const shadowsUnit = SHADOWS_BOM.map((g) => ({ ...g, items: g.items.filter((i) => !i.outside) }));
$('#bom-shadows').innerHTML = SHADOWS_BOM.map(bomTable).join('') + `<p class="small">Las cinco versiones juntas, con la base de la versión 0 una sola vez: <b class="mono" style="color:var(--fg)">${mxn(unionTotal(SHADOWS_BOM))}</b>.</p>`;
$('#bom-praxi').innerHTML = PRAXI_BOM.map(bomTable).join('');
$('#services-praxi').innerHTML = servicesTable('Servicios de taller · Praxiboscopic', PRAXI_SERVICES);
$('#bom-signage').innerHTML = SIGNAGE_BOM.map(bomTable).join('');
$('#services-signage').innerHTML = servicesTable('Servicios de taller · smart_signage', SIGNAGE_SERVICES);
selectVersion(0);

// resumen
const shadowsTotal = unionTotal(shadowsUnit);
const shadowsOutside = SHADOWS_BOM.flatMap((g) => g.items).filter((i) => i.outside && !i.alt).reduce((a, i) => a + i.qty * (i.price ?? 0), 0);
const praxiTotal = PRAXI_BOM.reduce((a, g) => a + groupTotal(g), 0);
const praxiOutside = PRAXI_BOM.flatMap((g) => g.items).filter((i) => i.outside && !i.alt).reduce((a, i) => a + i.qty * (i.price ?? 0), 0);
const signageTotal = SIGNAGE_BOM.reduce((a, g) => a + groupTotal(g), 0);
const signageOutside = SIGNAGE_BOM.flatMap((g) => g.items).filter((i) => i.outside && !i.alt).reduce((a, i) => a + i.qty * (i.price ?? 0), 0);
const praxiServices = PRAXI_SERVICES.reduce((a, r) => a + (r.estimate ?? 0), 0);
$('#resumen').innerHTML = `<div class="table-wrap card" style="padding:0"><table>
  <caption>Lo que pedimos a UNIT</caption>
  <thead><tr><th>Proyecto</th><th>Piezas del catálogo</th><th>Servicios de taller</th></tr></thead>
  <tbody>
    <tr><td><b>Shadows &amp; Lights</b><span class="note">protección de la obra (versión 0) y música, versiones 1–4</span></td><td class="num">${mxn(shadowsTotal)}</td><td>—</td></tr>
    <tr><td><b>Praxiboscopic</b><span class="note">mesa de dos tambores</span></td><td class="num">${mxn(praxiTotal - praxiOutside)}</td><td>impresión 3D (28 piezas, 16 h) y corte láser (41 piezas)<span class="note">≈ ${mxn(praxiServices)} en taller externo</span></td></tr>
    <tr><td><b>smart_signage</b><span class="note">cuatro letras, tapete y mesa</span></td><td class="num">${mxn(signageTotal - signageOutside)}</td><td>corte láser de 12 piezas grandes y 4 fondos; 64 esquineros impresos</td></tr>
    <tr class="total"><td>Piezas en total</td><td class="num">${mxn(shadowsTotal + praxiTotal - praxiOutside + signageTotal - signageOutside)}</td><td class="small" style="font-weight:400">más ${mxn(shadowsOutside + praxiOutside + signageOutside)} que compramos fuera de UNIT</td></tr>
  </tbody></table></div>`;

// capturas: el script de verificación espera esta marca
(window as unknown as { __propuesta: typeof scenes }).__propuesta = scenes;
