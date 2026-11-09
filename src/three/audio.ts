import * as THREE from 'three';
import { Viewer, damp, roundedBox } from './viewer';
import { COMPONENTS, VERSIONS, type Version, type LinkKind } from '../data/versions';
import { SEQUENCES, NUM_LEDS, renderSequence } from './engine';

const COL = 165; // mm entre columnas de la mesa
const ROW = 130;
const MIN = 30; // tamaño mínimo visible de una pieza

const LINK_COLOR: Record<LinkKind, number> = {
  power: 0xd9534f, data: 0xf0b429, serial: 0x8bc34a, audio: 0x4fc3f7, eth: 0x4f8cff, wifi: 0x4f8cff, radio: 0xb388ff, usb: 0x9e9e9e,
};

interface Node { group: THREE.Group; mesh: THREE.Mesh; target: THREE.Vector3; active: boolean; label: ReturnType<Viewer['label']>; mats: THREE.MeshStandardMaterial[]; }

/**
 * Mesa de trabajo: las piezas de cada versión aparecen en su lugar con sus conexiones. Al cambiar de versión las que
 * ya no hacen falta se hunden y se apagan, y las nuevas suben. La obra lleva una tira en vivo con la secuencia 06.
 */
export class AudioBench {
  readonly viewer: Viewer;
  private nodes = new Map<string, Node>();
  private links = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  private ringAnchor?: THREE.Vector3;
  private version: Version = VERSIONS[0];
  private ring?: THREE.InstancedMesh;
  private t0 = performance.now();

  constructor(el: HTMLElement) {
    this.viewer = new Viewer(el, { background: 0x0b0b0d, labels: true, fov: 32, near: 10, far: 6000, minDistance: 500, maxDistance: 2200 });
    const { scene, camera, controls } = this.viewer;
    camera.position.set(430, 540, 1080);
    controls.target.set(420, 0, 130);
    controls.maxPolarAngle = Math.PI * 0.48;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x202028, 0.9));
    const key = new THREE.DirectionalLight(0xfff4e6, 1.4);
    key.position.set(-300, 800, 500);
    scene.add(key);

    const bench = new THREE.Mesh(new THREE.PlaneGeometry(1500, 700), new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.95 }));
    bench.rotation.x = -Math.PI / 2;
    bench.position.set(380, -1, 130);
    scene.add(bench);
    const grid = new THREE.GridHelper(1500, 30, 0x2a2a33, 0x1e1e26);
    grid.position.set(380, 0, 130);
    scene.add(grid);

    for (const def of Object.values(COMPONENTS)) {
      const [w, d, h] = def.size;
      const W = Math.max(MIN, w), D = Math.max(MIN, d), H = Math.max(6, h);
      const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.55, metalness: 0.1, transparent: true, opacity: 0 });
      const mats = [mat];
      let mesh: THREE.Mesh;
      if (def.round) {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(MIN, w) / 2, Math.max(MIN, w) / 2, H, 32), mat);
      } else {
        mesh = roundedBox(W, D, H, 3, mat);
        mesh.rotation.x = -Math.PI / 2; // la caja se extruye en z: la acostamos
      }
      const group = new THREE.Group();
      group.add(mesh);
      mesh.position.y = H / 2;
      if (def.id === 'obra') this.buildArtwork(group, mats);
      if (def.id === 'mac') {
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.3, transparent: true, opacity: 0, emissive: 0x335577, emissiveIntensity: 0.6 });
        const screen = roundedBox(200, 130, 6, 3, screenMat);
        screen.position.set(0, 65 + 6, -66);
        screen.rotation.x = -0.12;
        group.add(screen);
        mats.push(screenMat);
      }
      if (def.id === 'nrfTx' || def.id === 'nrfRx') {
        const antMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, transparent: true, opacity: 0 });
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 90, 12), antMat);
        ant.position.set(W / 2 - 6, 45 + H, 0);
        group.add(ant);
        mats.push(antMat);
      }
      const label = this.viewer.label(`<b>${def.name}</b>${def.price ? `<span>MXN ${def.price}${def.link ? ` · <a href="${def.link}" target="_blank" rel="noopener">ficha UNIT</a>` : ''}</span>` : ''}`, 'v-label--comp');
      if (def.note) label.element.title = def.note;
      label.position.set(0, H + 14, D / 2 + 4);
      label.visible = false;
      group.add(label);
      group.position.set(0, -140, 0);
      group.visible = false;
      scene.add(group);
      this.nodes.set(def.id, { group, mesh, target: new THREE.Vector3(), active: false, label, mats });
    }

    scene.add(this.links);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x4f8cff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), ringMat.clone());
      r.rotation.x = -Math.PI / 2;
      r.visible = false;
      scene.add(r);
      this.rings.push(r);
    }

    this.setVersion(VERSIONS[0]);
    this.viewer.onTick((dt, t) => this.tick(dt, t));
  }

  /** La obra a escala 3:10: marco con el hueco y los 120 LEDs en vivo. */
  private buildArtwork(group: THREE.Group, mats: THREE.MeshStandardMaterial[]): void {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.9, transparent: true, opacity: 0 });
    mats.push(frameMat);
    const s = 0.3; // 60 cm → 180 mm
    const shape = new THREE.Shape();
    const o = 300 * s, i = 250 * s;
    shape.moveTo(-o, -o); shape.lineTo(o, -o); shape.lineTo(o, o); shape.lineTo(-o, o); shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-i, -i); hole.lineTo(-i, i); hole.lineTo(i, i); hole.lineTo(i, -i); hole.closePath();
    shape.holes.push(hole);
    const cover = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false }), frameMat);
    cover.rotation.x = -Math.PI / 2;
    cover.position.y = 60 * s + 5;
    group.add(cover);
    // panel con placas
    const panel = new THREE.Mesh(new THREE.BoxGeometry(600 * s, 20 * s, 600 * s), frameMat);
    panel.position.y = 10 * s;
    group.add(panel);
    const ledGeo = new THREE.BoxGeometry(4, 2, 4);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0 });
    this.ring = new THREE.InstancedMesh(ledGeo, ledMat, NUM_LEDS);
    const m = new THREE.Matrix4();
    const per = 4 * 500;
    for (let k = 0; k < NUM_LEDS; k++) {
      let d = (k / NUM_LEDS) * per; let x = 0, z = 0;
      if (d < 250) { x = d; z = -250; } else if ((d -= 250) < 500) { x = 250; z = -250 + d; } else if ((d -= 500) < 500) { x = 250 - d; z = 250; } else if ((d -= 500) < 500) { x = -250; z = 250 - d; } else { d -= 500; x = -250 + d; z = -250; }
      m.makeTranslation(x * s, 57 * s, z * s);
      this.ring.setMatrixAt(k, m);
      this.ring.setColorAt(k, new THREE.Color(0x111111));
    }
    group.add(this.ring);
    // el mesh base (la caja gris) no se usa para la obra
    (group.children[0] as THREE.Mesh).visible = false;
  }

  setVersion(v: Version): void {
    this.version = v;
    for (const n of this.nodes.values()) { n.active = false; n.label.visible = false; }
    for (const p of v.placements) {
      const n = this.nodes.get(p.id)!;
      n.active = true;
      n.group.visible = true;
      n.target.set(p.col * COL, 0, p.row * ROW);
      if (n.group.position.y < -100) { n.group.position.set(n.target.x, -120, n.target.z); }
      n.label.visible = true;
    }
    this.rebuildLinks();
  }

  private anchor(id: string): THREE.Vector3 {
    const n = this.nodes.get(id)!;
    const def = COMPONENTS[id];
    return new THREE.Vector3(n.target.x, Math.max(6, def.size[2]) / 2 + 2, n.target.z);
  }

  private rebuildLinks(): void {
    this.links.clear();
    this.ringAnchor = undefined;
    for (const l of this.version.links) {
      const a = this.anchor(l.from), b = this.anchor(l.to);
      const color = LINK_COLOR[l.kind];
      if (l.kind === 'wifi' || l.kind === 'radio') {
        this.ringAnchor = a.clone();
        for (const r of this.rings) ((r.material as THREE.MeshBasicMaterial).color.setHex(color));
        const pts = [a, new THREE.Vector3((a.x + b.x) / 2, 90, (a.z + b.z) / 2), b];
        const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
        const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 14, gapSize: 10, transparent: true, opacity: 0.9 }));
        line.computeLineDistances();
        this.links.add(line);
        continue;
      }
      // cables: salen en ángulo recto por la mesa, a ras
      const mid = new THREE.Vector3(b.x, 3, a.z);
      const pts = l.kind === 'eth' || l.kind === 'usb' || l.kind === 'audio' ? [a, new THREE.Vector3(a.x, 3, a.z), mid, new THREE.Vector3(b.x, 3, b.z), b] : [a, mid, b];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const width = l.kind === 'power' ? 3 : 1.5;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0), 32, width, 6, false), new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.25 }));
      this.links.add(tube);
      geo.dispose();
    }
    for (const r of this.rings) r.visible = !!this.ringAnchor;
  }

  private tick(dt: number, t: number): void {
    for (const n of this.nodes.values()) {
      const g = n.group;
      if (n.active) {
        g.position.x = damp(g.position.x, n.target.x, 6, dt);
        g.position.z = damp(g.position.z, n.target.z, 6, dt);
        g.position.y = damp(g.position.y, 0, 6, dt);
        for (const m of n.mats) m.opacity = damp(m.opacity, 1, 6, dt);
      } else {
        g.position.y = damp(g.position.y, -140, 4, dt);
        for (const m of n.mats) m.opacity = damp(m.opacity, 0, 6, dt);
        if (g.position.y < -130) g.visible = false;
      }
    }
    if (this.ring) {
      const n = this.nodes.get('obra')!;
      (this.ring.material as THREE.MeshBasicMaterial).opacity = n.mats[0].opacity;
      const f = renderSequence(SEQUENCES[3], (performance.now() - this.t0) % SEQUENCES[3].duration);
      const c = new THREE.Color();
      for (let k = 0; k < NUM_LEDS; k++) {
        c.setRGB(0.05 + f[k * 3] * 2.5, 0.05 + f[k * 3 + 1] * 2.5, 0.05 + f[k * 3 + 2] * 2.5);
        this.ring.setColorAt(k, c);
      }
      this.ring.instanceColor!.needsUpdate = true;
    }
    if (this.ringAnchor) {
      this.rings.forEach((r, i) => {
        const ph = ((t * 0.7 + i / 3) % 1);
        const s = 20 + ph * 140;
        r.scale.set(s, s, 1);
        r.position.copy(this.ringAnchor!).setY(4);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - ph);
      });
    }
  }
}
