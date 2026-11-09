import * as THREE from 'three';
import { Viewer, damp } from './viewer';
import { SEQUENCES, NUM_LEDS, renderSequence, type Sequence } from './engine';
import obra from '../data/obra.json';

/**
 * Shadows & Lights tal como está hoy (versión 0): cuadro de 60 × 60 cm en la pared, 28 placas de MDF de
 * 4,5 × 4,5 × 0,5 cm de canto, tapa a 6 cm con hueco de 50 × 50 y la tira de 120 LEDs bajo el borde del hueco,
 * inclinada 30°. Las secuencias son las del Arduino (engine.ts). Unidades: centímetros.
 */
export class ShadowsScene {
  readonly viewer: Viewer;
  private leds: THREE.InstancedMesh;
  private ledPos: THREE.Vector3[] = [];
  private ledDir: THREE.Vector3[] = [];
  private spots: THREE.SpotLight[] = [];
  private cover: THREE.Group;
  private plates: THREE.Group;
  private box: THREE.Group;
  private explodeTarget = 0;
  private explode = 0;
  private t0 = performance.now();
  seq: Sequence = SEQUENCES[0];
  speed = 1;

  constructor(el: HTMLElement, opts: { hero?: boolean } = {}) {
    this.viewer = new Viewer(el, { background: opts.hero ? null : 0x0b0b0d, shadows: true, fov: 35, near: 1, far: 1000, minDistance: 40, maxDistance: 260, autoRotate: !!opts.hero, exposure: 1.1 });
    const { scene, camera, controls } = this.viewer;
    // en la portada el cuadro queda a la derecha del texto: la cámara mira a un punto a su izquierda
    camera.position.set(opts.hero ? 10 : 48, opts.hero ? 22 : 26, opts.hero ? 118 : 92);
    controls.target.set(opts.hero ? -42 : 0, opts.hero ? 2 : 0, 3);
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.minAzimuthAngle = -Math.PI * 0.45;
    controls.maxAzimuthAngle = Math.PI * 0.45;

    // pared
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1600), new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.95 }));
    wall.position.z = -0.2;
    wall.receiveShadow = true;
    scene.add(wall);
    scene.add(new THREE.AmbientLight(0xffffff, opts.hero ? 0.05 : 0.08));
    const room = new THREE.DirectionalLight(0xfff2e0, 0.25);
    room.position.set(-60, 90, 140);
    scene.add(room);

    const mdf = new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.9 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(obra.panel.width, obra.panel.height, obra.panel.thickness), mdf);
    panel.position.z = -obra.panel.thickness / 2; // la cara frontal queda en z = 0
    panel.receiveShadow = true;
    panel.castShadow = true;
    scene.add(panel);

    // placas de canto
    this.plates = new THREE.Group();
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xf3f0e9, roughness: 0.9 });
    for (const p of obra.pieces) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.sx, p.sy, p.sz), plateMat);
      m.position.set(p.x, p.y, p.z);
      m.rotation.z = THREE.MathUtils.degToRad(p.rz);
      m.castShadow = m.receiveShadow = true;
      m.userData.base = m.position.clone();
      this.plates.add(m);
    }
    scene.add(this.plates);

    // tapa con hueco
    this.cover = new THREE.Group();
    const c = obra.panel.cover;
    const shape = new THREE.Shape();
    shape.moveTo(-obra.panel.width / 2, -obra.panel.height / 2); shape.lineTo(obra.panel.width / 2, -obra.panel.height / 2);
    shape.lineTo(obra.panel.width / 2, obra.panel.height / 2); shape.lineTo(-obra.panel.width / 2, obra.panel.height / 2); shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-c.holeWidth / 2, -c.holeHeight / 2); hole.lineTo(-c.holeWidth / 2, c.holeHeight / 2);
    hole.lineTo(c.holeWidth / 2, c.holeHeight / 2); hole.lineTo(c.holeWidth / 2, -c.holeHeight / 2); hole.closePath();
    shape.holes.push(hole);
    const coverGeo = new THREE.ExtrudeGeometry(shape, { depth: c.thickness, bevelEnabled: false });
    const coverMesh = new THREE.Mesh(coverGeo, mdf);
    coverMesh.position.z = c.height;
    coverMesh.castShadow = coverMesh.receiveShadow = true;
    this.cover.add(coverMesh);
    // paredes laterales del cuadro (del panel a la tapa)
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xe6e2d9, roughness: 0.9 });
    const h = c.height + c.thickness;
    const sides = [
      [obra.panel.width, 0.5, 0, obra.panel.height / 2 - 0.25],
      [obra.panel.width, 0.5, 0, -obra.panel.height / 2 + 0.25],
      [0.5, obra.panel.height, obra.panel.width / 2 - 0.25, 0],
      [0.5, obra.panel.height, -obra.panel.width / 2 + 0.25, 0],
    ] as const;
    for (const [w, d, x, y] of sides) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), sideMat);
      s.position.set(x, y, h / 2);
      s.castShadow = s.receiveShadow = true;
      this.cover.add(s);
    }

    // tira: 120 LEDs por el perímetro del hueco (50 × 50 → 200 cm), horario desde las 12
    const st = obra.strip;
    const per = 2 * (st.rectWidth + st.rectHeight);
    const stripMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
    const tilt = THREE.MathUtils.degToRad(30);
    const pcb = new THREE.Group();
    for (let i = 0; i < NUM_LEDS; i++) {
      const s = (i / NUM_LEDS) * per;
      const { p, inward } = this.perimeterPoint(s, st.rectWidth, st.rectHeight);
      // sobre el borde del hueco, bajo la tapa, apuntando al panel e inclinado hacia dentro
      const pos = new THREE.Vector3(p.x + inward.x * 0.5, p.y + inward.y * 0.5, st.height);
      const dir = new THREE.Vector3(inward.x * Math.sin(tilt), inward.y * Math.sin(tilt), -Math.cos(tilt)).normalize();
      this.ledPos.push(pos);
      this.ledDir.push(dir);
    }
    for (let k = 0; k < 4; k++) {
      const horiz = k % 2 === 0;
      const g = new THREE.BoxGeometry(horiz ? st.rectWidth : 1, horiz ? 1 : st.rectHeight, 0.15);
      const m = new THREE.Mesh(g, stripMat);
      const off = (horiz ? st.rectHeight : st.rectWidth) / 2 + 0.5;
      m.position.set(horiz ? 0 : (k === 1 ? off : -off), horiz ? (k === 0 ? off : -off) : 0, st.height + 0.2);
      m.rotation.x = horiz ? (k === 0 ? tilt : -tilt) : 0;
      m.rotation.y = horiz ? 0 : (k === 1 ? -tilt : tilt);
      pcb.add(m);
    }
    this.cover.add(pcb);
    const ledGeo = new THREE.BoxGeometry(0.5, 0.5, 0.16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.leds = new THREE.InstancedMesh(ledGeo, ledMat, NUM_LEDS);
    const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < NUM_LEDS; i++) {
      q.setFromUnitVectors(up, this.ledDir[i]);
      mat4.compose(this.ledPos[i], q, new THREE.Vector3(1, 1, 1));
      this.leds.setMatrixAt(i, mat4);
      this.leds.setColorAt(i, new THREE.Color(0x0a0a0a));
    }
    this.cover.add(this.leds);
    scene.add(this.cover);

    // focos: hasta 4 cúmulos de luz por fotograma proyectan las sombras reales de las placas
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.SpotLight(0xffffff, 0, 120, THREE.MathUtils.degToRad(55), 0.6, 1.2);
      sp.castShadow = true;
      sp.shadow.mapSize.set(1024, 1024);
      sp.shadow.bias = -0.0005;
      sp.shadow.camera.near = 1;
      sp.shadow.camera.far = 120;
      scene.add(sp, sp.target);
      this.spots.push(sp);
    }

    // electrónica en una esquina de la caja, bajo el borde de la tapa: ESP32-S3 SuperMini (2,2 × 1,8 cm) y la mini
    // protoboard de 170 puntos (4,7 × 3,5 cm) con el 74AHCT125. Se ve al levantar la tapa con «Ver por dentro».
    this.box = new THREE.Group();
    const proto = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.7, 0.9), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 }));
    proto.position.set(-27.6, -26.9, 0.45);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.9, 0.5), new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.5 }));
    chip.position.set(-27.6, -26.9, 1.15);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.35), new THREE.MeshStandardMaterial({ color: 0x1f6fb0, roughness: 0.5 }));
    board.position.set(-27.6, -22.9, 0.6);
    for (const m of [proto, chip, board]) m.castShadow = m.receiveShadow = true;
    this.box.add(proto, chip, board);
    scene.add(this.box);

    this.viewer.onTick((dt) => this.tick(dt));
  }

  /** Punto del perímetro del rectángulo a `s` cm desde el centro del lado de arriba, en sentido horario. */
  private perimeterPoint(s: number, w: number, h: number): { p: THREE.Vector2; inward: THREE.Vector2 } {
    const hw = w / 2, hh = h / 2;
    s = ((s % (2 * (w + h))) + 2 * (w + h)) % (2 * (w + h));
    if (s < hw) return { p: new THREE.Vector2(s, hh), inward: new THREE.Vector2(0, -1) };
    s -= hw;
    if (s < h) return { p: new THREE.Vector2(hw, hh - s), inward: new THREE.Vector2(-1, 0) };
    s -= h;
    if (s < w) return { p: new THREE.Vector2(hw - s, -hh), inward: new THREE.Vector2(0, 1) };
    s -= w;
    if (s < h) return { p: new THREE.Vector2(-hw, -hh + s), inward: new THREE.Vector2(1, 0) };
    s -= h;
    return { p: new THREE.Vector2(-hw + s, hh), inward: new THREE.Vector2(0, -1) };
  }

  setSequence(seq: Sequence): void { this.seq = seq; this.t0 = performance.now(); }
  setExplode(v: number): void { this.explodeTarget = v; }
  /** ms transcurridos dentro de la secuencia (para la línea de tiempo). */
  get time(): number { return ((performance.now() - this.t0) * this.speed) % this.seq.duration; }

  private tick(dt: number): void {
    const f = renderSequence(this.seq, this.time);
    const col = new THREE.Color();
    const lum = new Float32Array(NUM_LEDS);
    for (let i = 0; i < NUM_LEDS; i++) {
      const r = f[i * 3], g = f[i * 3 + 1], b = f[i * 3 + 2];
      lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // LEDs: se ven encendidos con su color (el tone mapping no los apaga)
      col.setRGB(0.04 + r * 3, 0.04 + g * 3, 0.04 + b * 3);
      this.leds.setColorAt(i, col);
    }
    this.leds.instanceColor!.needsUpdate = true;

    // cúmulos: el LED más brillante, se descartan sus vecinos (±14 LEDs) y se repite hasta 4 veces
    const used = new Uint8Array(NUM_LEDS);
    for (let k = 0; k < this.spots.length; k++) {
      let best = -1, bl = 0.02;
      for (let i = 0; i < NUM_LEDS; i++) if (!used[i] && lum[i] > bl) { bl = lum[i]; best = i; }
      const sp = this.spots[k];
      if (best < 0) { sp.intensity = damp(sp.intensity, 0, 14, dt); continue; }
      let sr = 0, sg = 0, sb = 0, sw = 0; const pos = new THREE.Vector3(), dir = new THREE.Vector3();
      for (let d = -14; d <= 14; d++) {
        const i = (best + d + NUM_LEDS) % NUM_LEDS;
        if (used[i]) continue;
        used[i] = 1;
        const w = lum[i];
        if (w <= 0) continue;
        sr += f[i * 3] * w; sg += f[i * 3 + 1] * w; sb += f[i * 3 + 2] * w; sw += w;
        pos.addScaledVector(this.ledPos[i], w);
        dir.addScaledVector(this.ledDir[i], w);
      }
      if (sw <= 0) { sp.intensity = damp(sp.intensity, 0, 14, dt); continue; }
      pos.divideScalar(sw); dir.normalize();
      sp.color.setRGB(sr / sw, sg / sw, sb / sw).multiplyScalar(1 / Math.max(sr / sw, sg / sw, sb / sw, 1e-3));
      // la suma de LEDs del cúmulo marca la potencia: ~6 cd por LED en el modelo
      sp.intensity = Math.min(sw * 9, 260);
      pos.z += this.explode * 10;
      sp.position.copy(pos);
      sp.target.position.copy(pos).addScaledVector(dir, 40);
      sp.target.updateMatrixWorld();
    }

    // explosión: la tapa sube, las placas se despegan un poco y queda a la vista la electrónica de la esquina
    this.explode = damp(this.explode, this.explodeTarget, 6, dt);
    this.cover.position.z = this.explode * 10;
    for (const m of this.plates.children) {
      const b = (m as THREE.Mesh).userData.base as THREE.Vector3;
      m.position.set(b.x, b.y, b.z + this.explode * 3.5);
    }
    this.box.position.z = this.explode * 1.5;
  }
}
