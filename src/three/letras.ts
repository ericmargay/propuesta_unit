import * as THREE from 'three';
import { Viewer, damp } from './viewer';
import letras from '../data/letras.json';

type Letter = (typeof letras.letras)[number];

const WARM: [number, number, number] = [1, 0.8, 0.58];
const HUES: Record<string, [number, number, number]> = { U: [0.25, 0.55, 1], N: [0.3, 1, 0.45], I: [1, 0.72, 0.2], T: [1, 0.3, 0.75] };

interface LetterRig {
  def: Letter;
  face: THREE.Mesh;
  sides: THREE.Mesh;
  back: THREE.Mesh;
  leds: THREE.InstancedMesh;
  ledPos: THREE.Vector3[];
  ledAlong: Float32Array; // posición normalizada 0..1 a lo largo de la tira
  faceMat: THREE.MeshStandardMaterial;
  centerX: number;
  pad: number; // 0..1 mano en la mesa
  padTarget: number;
}

/**
 * smart_signage: las cuatro letras a 1,2 m, en mm reales desde letras.json. Las caras y los costados son acrílico
 * opal; el fondo, MDF; la tira WS2815 va en serpentina por el fondo. Respiran solas y reaccionan al tapete (onda
 * blanca que recorre la palabra) y a la mesa (cada letra se enciende de su color mientras la mano esté).
 */
export class LettersScene {
  readonly viewer: Viewer;
  private rigs: LetterRig[] = [];
  private explode = 0;
  private explodeTarget = 0;
  private ripples: Array<{ x: number; t: number }> = [];
  private mat: THREE.Mesh;
  private table: THREE.Group;
  private pads: THREE.Mesh[] = [];
  private layerLabels: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();

  constructor(el: HTMLElement) {
    this.viewer = new Viewer(el, { background: 0x0b0b0d, labels: true, fov: 32, near: 10, far: 20000, minDistance: 1500, maxDistance: 7000, exposure: 1.05 });
    const { scene, camera, controls } = this.viewer;
    const W = letras.anchoTotalMm, H = letras.altoMm, D = letras.fondoMm;
    controls.target.set(W / 2, H * 0.5, 0);
    camera.position.set(W / 2 - 900, 1500, 4300);
    controls.maxPolarAngle = Math.PI * 0.5;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x101014, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 0.35);
    key.position.set(-1000, 3000, 2500);
    scene.add(key);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14000, 10000), new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(W / 2, -1, 0);
    scene.add(floor);
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14000, 6000), new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.95 }));
    backWall.position.set(W / 2, 3000, -D - 400);
    scene.add(backWall);

    // base rodante de MDF de 18 mm
    const base = new THREE.Mesh(new THREE.BoxGeometry(W + 300, 60, 400), new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.9 }));
    base.position.set(W / 2, 30, -D / 2 + 100);
    scene.add(base);

    const opal = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, transparent: true, opacity: 0.93, emissive: 0xffffff, emissiveIntensity: 0.05, side: THREE.DoubleSide });
    const mdf = new THREE.MeshStandardMaterial({ color: 0x4a3b2e, roughness: 0.9 });
    const ledGeo = new THREE.BoxGeometry(10, 10, 2.5);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

    for (const def of letras.letras) {
      const shape = new THREE.Shape(def.outline.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.Group();
      g.position.set(def.x0Mm, 60, 0);
      // fondo (MDF 6 mm), atrás
      const back = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false }), mdf);
      back.position.z = -D;
      // costados (acrílico opal, 200 mm): extrusión sin tapas
      const sideMat = opal();
      const sidesGeo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false });
      const sides = new THREE.Mesh(sidesGeo, [new THREE.MeshBasicMaterial({ visible: false }), sideMat]);
      sides.position.z = -D;
      // cara (acrílico opal 3 mm)
      const faceMat = opal();
      const face = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false }), faceMat);
      face.position.z = 0;
      // tira en serpentina: filas cada pasoTiraMm dentro del polígono
      const ledPos: THREE.Vector3[] = [];
      const rows: THREE.Vector2[][] = [];
      for (let y = letras.pasoTiraMm / 2; y < letras.altoMm; y += letras.pasoTiraMm) {
        const xs = rowCrossings(def.outline, y).sort((a, b) => a - b);
        const segs: THREE.Vector2[] = [];
        for (let i = 0; i + 1 < xs.length; i += 2) segs.push(new THREE.Vector2(xs[i] + 15, xs[i + 1] - 15));
        rows.push(segs);
      }
      const pitch = 1000 / letras.ledsPorMetro;
      let flip = false;
      for (const segs of rows) {
        const ordered = flip ? [...segs].reverse() : segs;
        for (const s of ordered) {
          const a = flip ? s.y : s.x, b = flip ? s.x : s.y, dir = Math.sign(b - a);
          const n = Math.floor(Math.abs(b - a) / pitch);
          for (let k = 0; k <= n; k++) ledPos.push(new THREE.Vector3(a + dir * k * pitch, 0, 0));
        }
        flip = !flip;
      }
      // y de cada LED: la fila a la que pertenece
      let idx = 0; flip = false;
      const ledY: number[] = [];
      rows.forEach((segs, r) => {
        const y = letras.pasoTiraMm / 2 + r * letras.pasoTiraMm;
        const ordered = flip ? [...segs].reverse() : segs;
        for (const s of ordered) { const n = Math.floor(Math.abs(s.y - s.x) / pitch); for (let k = 0; k <= n; k++) { ledY[idx++] = y; } }
        flip = !flip;
      });
      ledPos.forEach((p, i) => { p.y = ledY[i]; p.z = -D + 12; });
      const leds = new THREE.InstancedMesh(ledGeo, ledMat, ledPos.length);
      const m = new THREE.Matrix4();
      ledPos.forEach((p, i) => { m.makeTranslation(p.x, p.y, p.z); leds.setMatrixAt(i, m); leds.setColorAt(i, new THREE.Color(0x202020)); });
      const ledAlong = new Float32Array(ledPos.length);
      for (let i = 0; i < ledPos.length; i++) ledAlong[i] = i / Math.max(1, ledPos.length - 1);
      g.add(back, sides, face, leds);
      scene.add(g);
      this.rigs.push({ def, face, sides, back, leds, ledPos, ledAlong, faceMat, centerX: def.x0Mm + def.anchoMm / 2, pad: 0, padTarget: 0 });
    }

    // rótulos de capas (se ven con la explosión)
    const first = this.rigs[0];
    const mk = (html: string, pos: THREE.Vector3) => { const l = this.viewer.label(html, 'v-label--layer'); l.position.copy(pos); l.visible = false; scene.add(l); this.layerLabels.push(l); return l; };
    mk('<b>Cara</b><span>acrílico opal 3 mm · corte láser</span>', new THREE.Vector3(first.def.x0Mm + first.def.anchoMm / 2, H + 120, 420));
    mk('<b>Costados</b><span>acrílico opal 3 mm × 200 mm</span>', new THREE.Vector3(first.def.x0Mm + first.def.anchoMm / 2, H + 120, -100));
    mk('<b>Tira WS2815</b><span>12 V · 60 LED/m · serpentina cada 100 mm</span>', new THREE.Vector3(first.def.x0Mm + first.def.anchoMm / 2, H + 120, -330));
    mk('<b>Fondo</b><span>MDF 6 mm · esquineros impresos</span>', new THREE.Vector3(first.def.x0Mm + first.def.anchoMm / 2, H + 120, -620));

    // silueta a escala (1,70 m)
    const person = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x2c2c33, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(170, 900, 8, 16), skin);
    body.position.y = 170 + 450 + 60;
    const head = new THREE.Mesh(new THREE.SphereGeometry(115, 24, 16), skin);
    head.position.y = 1700 - 115;
    person.add(body, head);
    person.position.set(-700, 0, 300);
    scene.add(person);
    const pl = this.viewer.label('<b>1,70 m</b><span>las letras miden 1,20 m</span>', 'v-label--layer');
    pl.position.set(0, 1800, 0);
    person.add(pl);

    // tapete con dos FSR
    this.mat = new THREE.Mesh(new THREE.BoxGeometry(1200, 12, 700), new THREE.MeshStandardMaterial({ color: 0x242430, roughness: 0.95 }));
    this.mat.position.set(W / 2, 6, 1100);
    scene.add(this.mat);
    for (const x of [-300, 300]) {
      const fsr = new THREE.Mesh(new THREE.BoxGeometry(160, 2, 160), new THREE.MeshStandardMaterial({ color: 0x3b3b4a, roughness: 0.6 }));
      fsr.position.set(x, 7, 0);
      this.mat.add(fsr);
    }
    const ml = this.viewer.label('<b>Tapete</b><span>2 FSR 406 + ESP32-C3 · pisa aquí</span>', 'v-label--sensor');
    ml.position.set(0, 60, 0);
    this.mat.add(ml);

    // mesa con cuatro pads
    this.table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(600, 20, 400), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, transparent: true, opacity: 0.85 }));
    top.position.y = 750;
    this.table.add(top);
    for (const [x, z] of [[-150, -80], [150, -80], [-150, 80], [150, 80]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 740, 12), new THREE.MeshStandardMaterial({ color: 0x333338 }));
      leg.position.set(x * 1.6, 370, z * 1.9);
      this.table.add(leg);
    }
    ['U', 'N', 'I', 'T'].forEach((ch, i) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(110, 4, 110), new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.4, metalness: 0.6, emissive: 0x000000 }));
      pad.position.set(-210 + i * 140, 762, 0);
      pad.userData.letter = ch;
      this.table.add(pad);
      this.pads.push(pad);
    });
    this.table.position.set(W + 900, 0, 500);
    scene.add(this.table);
    const tl = this.viewer.label('<b>Mesa</b><span>UNIT TouchDot S3 · 4 pads de cobre bajo el acrílico · toca uno</span>', 'v-label--sensor');
    tl.position.set(0, 860, 0);
    this.table.add(tl);

    // clics: tapete y pads
    el.addEventListener('pointerdown', (e) => this.onPointer(e, el));
    this.viewer.onTick((dt, t) => this.tick(dt, t));
  }

  setExplode(v: number): void { this.explodeTarget = v; }
  /** pisada en el tapete: zona 0 (izquierda, letra U) o 1 (derecha, letra T) */
  stepOnMat(zone: 0 | 1): void {
    const rig = zone === 0 ? this.rigs[0] : this.rigs[3];
    this.ripples.push({ x: rig.centerX, t: 0 });
    if (this.ripples.length > 4) this.ripples.shift();
  }
  /** mano sobre el pad de una letra: mantiene el color 1,6 s */
  touchPad(ch: string): void {
    const rig = this.rigs.find((r) => r.def.char === ch);
    if (!rig) return;
    rig.padTarget = 1;
    window.setTimeout(() => { rig.padTarget = 0; }, 1600);
  }

  private onPointer(e: PointerEvent, el: HTMLElement): void {
    const r = el.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.viewer.camera);
    const hits = this.raycaster.intersectObjects([this.mat, ...this.pads], true);
    if (!hits.length) return;
    const o = hits[0].object as THREE.Mesh;
    if (o.userData.letter) { this.touchPad(o.userData.letter); return; }
    const local = this.mat.worldToLocal(hits[0].point.clone());
    this.stepOnMat(local.x < 0 ? 0 : 1);
  }

  private tick(dt: number, t: number): void {
    this.explode = damp(this.explode, this.explodeTarget, 5, dt);
    for (const l of this.layerLabels) l.visible = this.explode > 0.4;
    for (const rp of this.ripples) rp.t += dt;
    this.ripples = this.ripples.filter((rp) => rp.t < 3.2);
    const c = new THREE.Color();
    this.rigs.forEach((rig, li) => {
      const e = this.explode;
      rig.face.position.z = e * 420;
      rig.leds.position.z = e * -120;
      rig.back.position.z = -letras.fondoMm - e * 420;
      rig.pad = damp(rig.pad, rig.padTarget, 8, dt);
      // reposo: respiración desfasada + destello que recorre la tira (como controller.ino)
      const breath = 0.22 + 0.18 * (0.5 + 0.5 * Math.sin(t * 0.9 + li * 1.3));
      const spark = (t * 0.12 + li * 0.25) % 1;
      let sumR = 0, sumG = 0, sumB = 0;
      const hue = HUES[rig.def.char];
      for (let i = 0; i < rig.ledPos.length; i++) {
        let r = WARM[0] * breath, g = WARM[1] * breath, b = WARM[2] * breath;
        const ds = Math.abs(rig.ledAlong[i] - spark);
        const sp = Math.max(0, 1 - ds / 0.06);
        r += sp * 0.6; g += sp * 0.6; b += sp * 0.6;
        // onda del tapete: frente que avanza 1,4 m/s por la palabra
        const wx = rig.def.x0Mm + rig.ledPos[i].x;
        for (const rp of this.ripples) {
          const front = rp.t * 1400;
          const d = Math.abs(Math.abs(wx - rp.x) - front);
          const w = Math.exp(-(d * d) / (2 * 180 * 180)) * Math.max(0, 1 - rp.t / 3);
          r += w; g += w; b += w;
        }
        // mano en la mesa: color de la letra
        r = r * (1 - rig.pad) + hue[0] * rig.pad;
        g = g * (1 - rig.pad) + hue[1] * rig.pad;
        b = b * (1 - rig.pad) + hue[2] * rig.pad;
        sumR += r; sumG += g; sumB += b;
        c.setRGB(0.06 + Math.min(1.6, r * 1.6), 0.06 + Math.min(1.6, g * 1.6), 0.06 + Math.min(1.6, b * 1.6));
        rig.leds.setColorAt(i, c);
      }
      rig.leds.instanceColor!.needsUpdate = true;
      const n = Math.max(1, rig.ledPos.length);
      // la cara difunde: su emisión es el promedio de la tira
      const er = sumR / n, eg = sumG / n, eb = sumB / n;
      const mx = Math.max(er, eg, eb, 1e-3);
      rig.faceMat.emissive.setRGB(er / mx, eg / mx, eb / mx);
      rig.faceMat.emissiveIntensity = 0.15 + mx * 1.25 * (1 - e * 0.6);
      const sm = (rig.sides.material as THREE.Material[])[1] as THREE.MeshStandardMaterial;
      sm.emissive.copy(rig.faceMat.emissive);
      sm.emissiveIntensity = rig.faceMat.emissiveIntensity * 0.55;
    });
    // pads: brillan mientras la letra está tocada
    this.pads.forEach((pad, i) => {
      const rig = this.rigs[i];
      const hue = HUES[rig.def.char];
      (pad.material as THREE.MeshStandardMaterial).emissive.setRGB(hue[0] * rig.pad, hue[1] * rig.pad, hue[2] * rig.pad);
    });
  }
}

/** Cortes de la línea horizontal y con las aristas verticales de un polígono rectilíneo. */
function rowCrossings(outline: number[][], y: number): number[] {
  const xs: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const [x1, y1] = outline[i], [x2, y2] = outline[(i + 1) % outline.length];
    if (x1 !== x2) continue;
    const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
    if (y > lo && y < hi) xs.push(x1);
  }
  return xs;
}
