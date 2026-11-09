import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export interface ViewerOptions {
  /** fondo (color CSS) o null para transparente */
  background?: number | null;
  fov?: number;
  near?: number;
  far?: number;
  shadows?: boolean;
  labels?: boolean;
  /** límites de la órbita */
  minDistance?: number;
  maxDistance?: number;
  maxPolar?: number;
  autoRotate?: boolean;
  exposure?: number;
}

/**
 * Visor Three.js que vive dentro de un contenedor de la página: se adapta a su tamaño, se pausa cuando sale de
 * pantalla, admite órbita y rótulos HTML. Cada sección de la presentación crea uno.
 */
export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly labels?: CSS2DRenderer;
  readonly clock = new THREE.Clock();
  private visible = false;
  private raf = 0;
  private tickers: Array<(dt: number, t: number) => void> = [];
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  constructor(readonly el: HTMLElement, opts: ViewerOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: opts.background === null, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = opts.exposure ?? 1;
    if (opts.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.renderer.domElement.className = 'viewer-canvas';
    el.appendChild(this.renderer.domElement);
    if (opts.background !== null) this.scene.background = new THREE.Color(opts.background ?? 0x0b0b0d);

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 1, opts.near ?? 0.1, opts.far ?? 5000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = opts.minDistance ?? 1;
    this.controls.maxDistance = opts.maxDistance ?? 1000;
    this.controls.maxPolarAngle = opts.maxPolar ?? Math.PI;
    this.controls.autoRotate = opts.autoRotate ?? false;
    this.controls.autoRotateSpeed = 0.6;
    // la rueda del ratón sigue haciendo scroll en la página: el zoom va con ctrl/⌘ o con dos dedos en móvil
    this.controls.enableZoom = false;
    this.renderer.domElement.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const d = this.camera.position.distanceTo(this.controls.target);
      const nd = THREE.MathUtils.clamp(d * (1 + Math.sign(e.deltaY) * 0.08), this.controls.minDistance, this.controls.maxDistance);
      this.camera.position.sub(this.controls.target).setLength(nd).add(this.controls.target);
    }, { passive: false });

    if (opts.labels) {
      this.labels = new CSS2DRenderer();
      this.labels.domElement.className = 'viewer-labels';
      el.appendChild(this.labels.domElement);
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        this.visible = en.isIntersecting;
        if (this.visible) this.start();
      }
    }, { rootMargin: '120px' });
    this.io.observe(el);
    this.resize();
  }

  resize(): void {
    const w = Math.max(1, this.el.clientWidth), h = Math.max(1, this.el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.labels?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  onTick(fn: (dt: number, t: number) => void): void { this.tickers.push(fn); }

  label(text: string, cls = ''): CSS2DObject {
    const div = document.createElement('div');
    div.className = `v-label ${cls}`.trim();
    div.innerHTML = text;
    return new CSS2DObject(div);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.labels?.render(this.scene, this.camera);
  }

  private start(): void {
    if (this.raf) return;
    this.clock.getDelta();
    const loop = () => {
      if (!this.visible || document.hidden) { this.raf = 0; return; }
      const dt = Math.min(0.1, this.clock.getDelta());
      const t = this.clock.elapsedTime;
      for (const f of this.tickers) f(dt, t);
      this.controls.update();
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Captura PNG del lienzo (para las capturas del script). */
  snapshot(): string {
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }
}

/** Interpolación suave para transiciones (explosión, cambios de versión). */
export const damp = (a: number, b: number, lambda: number, dt: number) => THREE.MathUtils.damp(a, b, lambda, dt);

/** Caja con bordes redondeados a partir de su tamaño en mm (o cm), útil para componentes electrónicos. */
export function roundedBox(w: number, h: number, d: number, r: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}
