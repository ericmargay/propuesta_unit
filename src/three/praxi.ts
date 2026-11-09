import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Viewer, damp } from './viewer';

export interface PrintedPart { id: string; file: string; name: string; qty: number; grams: number; box: string; group: number; }

/** Las 16 piezas impresas de la mesa de dos tambores (public/fabricacion/tambores/README.md de Praxiboscopic). */
export const PARTS: PrintedPart[] = [
  { id: 'I01', file: 'I01-nucleo-tambor.stl', name: 'Núcleo del tambor', qty: 2, grams: 63, box: '103 × 103 × 46', group: 0 },
  { id: 'I02', file: 'I02-cuerpo-guia.stl', name: 'Cuerpo de guía', qty: 2, grams: 38, box: '60 × 60 × 42', group: 0 },
  { id: 'I03', file: 'I03-cuerpo-rodillo-tensor.stl', name: 'Cuerpo del rodillo tensor', qty: 1, grams: 24, box: '40 × 40 × 42', group: 0 },
  { id: 'I04', file: 'I04-brazo-tensor.stl', name: 'Brazo tensor', qty: 1, grams: 9, box: '92 × 18 × 8', group: 1 },
  { id: 'I05', file: 'I05-copa-pivote.stl', name: 'Copa del pivote', qty: 1, grams: 18, box: '36 × 36 × 30', group: 1 },
  { id: 'I06', file: 'I06-tapa-iman.stl', name: 'Tapa del imán', qty: 1, grams: 2, box: '14 × 14 × 6', group: 1 },
  { id: 'I07', file: 'I07-tapon-eje.stl', name: 'Tapón del eje', qty: 4, grams: 2, box: '14 × 14 × 8', group: 1 },
  { id: 'I08', file: 'I08-poste-tapa.stl', name: 'Poste de la tapa', qty: 4, grams: 5, box: '12 × 12 × 60', group: 2 },
  { id: 'I09', file: 'I09-poste-hueco.stl', name: 'Poste hueco', qty: 2, grams: 6, box: '14 × 14 × 60', group: 2 },
  { id: 'I10', file: 'I10-capuchon-sensor.stl', name: 'Capuchón del sensor', qty: 2, grams: 7, box: '36 × 30 × 18', group: 2 },
  { id: 'I14', file: 'I14-brazo-sensor-marcas.stl', name: 'Brazo del sensor de marcas', qty: 1, grams: 3, box: '40 × 12 × 8', group: 2 },
  { id: 'I15', file: 'I15-ancla-resorte.stl', name: 'Ancla del resorte', qty: 1, grams: 3, box: '20 × 10 × 14', group: 2 },
  { id: 'I16', file: 'I16-espiga.stl', name: 'Espiga', qty: 4, grams: 1, box: '6 × 6 × 12', group: 2 },
  { id: 'I11', file: 'I11-cabeza-led.stl', name: 'Cabeza del LED', qty: 1, grams: 12, box: '46 × 46 × 20', group: 3 },
  { id: 'I12', file: 'I12-tubo-condensador.stl', name: 'Tubo del condensador', qty: 1, grams: 22, box: '48 × 48 × 60', group: 3 },
  { id: 'I13', file: 'I13-cuna-lente.stl', name: 'Cuna de la lente', qty: 1, grams: 38, box: '70 × 60 × 40', group: 3 },
];

const GROUP_NAMES = ['Tambores y rodillos', 'Brazo tensor y pivote', 'Postes, tapas y sensores', 'Óptica'];

interface Sheet { file: string; name: string; color: number; stroke: number; w: number; h: number; opacity: number; }
const SHEETS: Sheet[] = [
  { file: 'mesa-tambores-mdf-5.5mm-hoja-1.svg', name: 'MDF 5,5 mm · 20 piezas · 15,8 m de corte', color: 0x8a6a45, stroke: 0xffd9a0, w: 870, h: 570, opacity: 1 },
  { file: 'mesa-tambores-acrilico-transparente-3mm-hoja-1.svg', name: 'Acrílico transparente 3 mm · 18 piezas · 10,7 m', color: 0x9fd3ff, stroke: 0xffffff, w: 870, h: 570, opacity: 0.22 },
  { file: 'mesa-tambores-acrilico-negro-3mm-hoja-1.svg', name: 'Acrílico negro 3 mm · 3 piezas', color: 0x101014, stroke: 0xff6b6b, w: 870, h: 570, opacity: 1 },
];

/**
 * Lo que Praxiboscopic pide a los talleres: las 16 piezas impresas (STL reales) flotando sobre las tres hojas de
 * corte láser (SVG reales, 1:1 en mm). El deslizador las separa; el cursor dice qué es cada una.
 */
export class PraxiScene {
  readonly viewer: Viewer;
  private parts = new THREE.Group();
  private explode = 0;
  private explodeTarget = 0.5;
  private hover?: THREE.Mesh;
  private label: ReturnType<Viewer['label']>;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(2, 2);
  readonly ready: Promise<void>;

  constructor(el: HTMLElement, base: string) {
    this.viewer = new Viewer(el, { background: 0x0b0b0d, labels: true, fov: 34, near: 10, far: 8000, minDistance: 500, maxDistance: 3000 });
    const { scene, camera, controls } = this.viewer;
    camera.position.set(-260, 560, 900);
    controls.target.set(0, 40, -40);
    controls.maxPolarAngle = Math.PI * 0.49;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a22, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(400, 900, 600);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fb8ff, 0.5);
    fill.position.set(-600, 300, -400);
    scene.add(fill);

    const table = new THREE.Mesh(new THREE.PlaneGeometry(3000, 2200), new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2;
    table.position.y = -2;
    scene.add(table);

    this.label = this.viewer.label('', 'v-label--part');
    this.label.visible = false;
    scene.add(this.label);
    scene.add(this.parts);

    const stl = new STLLoader();
    const petg = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.45, metalness: 0.05 });
    const loads = PARTS.map((p, i) => new Promise<void>((resolve) => {
      stl.load(`${base}models/praxiboscopic/${p.file}`, (geo) => {
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        const size = new THREE.Vector3(); bb.getSize(size);
        const center = new THREE.Vector3(); bb.getCenter(center);
        geo.translate(-center.x, -center.y, -bb.min.z); // apoyada en z = 0, centrada
        const mesh = new THREE.Mesh(geo, petg.clone());
        mesh.rotation.x = -Math.PI / 2; // el STL está con z arriba; Three usa y arriba
        mesh.userData = { part: p, index: i, size };
        const holder = new THREE.Group();
        holder.add(mesh);
        this.parts.add(holder);
        resolve();
      }, undefined, () => resolve());
    }));

    // hojas de corte: una junto a otra detrás de las piezas, con sus trazos
    const svg = new SVGLoader();
    const sheetLoads = SHEETS.map((s, i) => new Promise<void>((resolve) => {
      const g = new THREE.Group();
      const x = (i - 1) * 920;
      g.position.set(x, 0, -520);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.85, transparent: s.opacity < 1, opacity: s.opacity }));
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(0, 0.5, 0);
      g.add(plane);
      const lab = this.viewer.label(`<b>Corte láser</b><span>${s.name}</span>`, 'v-label--sheet');
      lab.position.set(0, 10, -s.h / 2 - 40);
      g.add(lab);
      scene.add(g);
      svg.load(`${base}models/praxiboscopic/laser/${s.file}`, (data) => {
        const mat = new THREE.LineBasicMaterial({ color: s.stroke, transparent: true, opacity: 0.9 });
        const lines = new THREE.Group();
        for (const path of data.paths) {
          for (const sub of path.subPaths) {
            const pts = sub.getPoints(12);
            if (pts.length < 2) continue;
            const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x - s.w / 2, 0, p.y - s.h / 2)));
            lines.add(new THREE.Line(geo, mat));
          }
        }
        lines.position.y = 1.2;
        g.add(lines);
        resolve();
      }, undefined, () => resolve());
    }));

    this.ready = Promise.all([...loads, ...sheetLoads]).then(() => this.layout());

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    });
    el.addEventListener('pointerleave', () => this.pointer.set(2, 2));
    this.viewer.onTick((dt) => this.tick(dt));
  }

  setExplode(v: number): void { this.explodeTarget = v; }

  /** Cama de impresión: cuatro filas (una por grupo), piezas en orden; la explosión separa filas y columnas. */
  private layout(): void {
    const rows: THREE.Group[][] = [[], [], [], []];
    for (const h of this.parts.children as THREE.Group[]) {
      const p = (h.children[0] as THREE.Mesh).userData.part as PrintedPart;
      rows[p.group].push(h);
    }
    const rowDepth = 130;
    rows.forEach((row, r) => {
      let x = 0;
      const widths = row.map((h) => Math.max(40, ((h.children[0] as THREE.Mesh).userData.size as THREE.Vector3).x));
      const total = widths.reduce((a, b) => a + b + 24, -24);
      x = -total / 2;
      row.forEach((h, i) => {
        const w = widths[i];
        h.userData.compact = new THREE.Vector3(x + w / 2, 0, (r - 1.5) * rowDepth);
        h.userData.spread = new THREE.Vector3((x + w / 2) * 1.9, 60 + (3 - r) * 55, (r - 1.5) * rowDepth * 2.1);
        x += w + 24;
      });
    });
  }

  private tick(dt: number): void {
    this.explode = damp(this.explode, this.explodeTarget, 5, dt);
    for (const h of this.parts.children as THREE.Group[]) {
      const c = h.userData.compact as THREE.Vector3 | undefined, s = h.userData.spread as THREE.Vector3 | undefined;
      if (!c || !s) continue;
      h.position.lerpVectors(c, s, this.explode);
    }
    // cursor
    this.raycaster.setFromCamera(this.pointer, this.viewer.camera);
    const hits = this.raycaster.intersectObjects(this.parts.children, true);
    const hit = hits[0]?.object as THREE.Mesh | undefined;
    if (hit !== this.hover) {
      if (this.hover) ((this.hover.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000));
      this.hover = hit;
      if (hit) {
        (hit.material as THREE.MeshStandardMaterial).emissive.setHex(0x552200);
        const p = hit.userData.part as PrintedPart;
        this.label.element.innerHTML = `<b>${p.id} · ${p.name}</b><span>${p.qty} pieza${p.qty > 1 ? 's' : ''} · ${p.grams} g c/u · ${p.box} mm</span><em>${GROUP_NAMES[p.group]} · PETG</em>`;
        this.label.visible = true;
      } else this.label.visible = false;
    }
    if (this.hover) {
      const size = this.hover.userData.size as THREE.Vector3;
      this.label.position.copy(this.hover.parent!.position).add(new THREE.Vector3(0, size.z + 30, 0));
    }
    this.viewer.renderer.domElement.style.cursor = this.hover ? 'help' : 'grab';
  }
}
