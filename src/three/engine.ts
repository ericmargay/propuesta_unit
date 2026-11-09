// Motor de secuencias de Shadows & Lights portado a TypeScript desde src/sketches/engine.ino.
// Mismas funciones, mismos nombres, mismos tiempos: lo que se ve aquí es lo que hace el Arduino.

export const NUM_LEDS = 120;
export const STRIP_CM = 200;
const GAMMA = 2.2;
const TAIL_CURVE = 1.5;
const HEAD_CM = 1.4;

export const DEG = (x: number) => (x * NUM_LEDS) / 360;
export const CM = (x: number) => (x * NUM_LEDS) / STRIP_CM;
const HEAD_W = Math.max(1, CM(HEAD_CM));
const CW = 1;
const CCW = -1;

const gammaLUT = new Float32Array(256);
const curveLUT = new Float32Array(129);
for (let i = 0; i < 256; i++) gammaLUT[i] = Math.round(255 * Math.pow(i / 255, GAMMA)) / 255;
for (let i = 0; i <= 128; i++) curveLUT[i] = Math.round(255 * (1 - Math.pow(i / 128, TAIL_CURVE))) / 255;

export type RGB = [number, number, number];
export const WHITE: RGB = [1, 1, 1];
const hex = (h: number): RGB => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

/** Fotograma: r,g,b lineales (0..1) por LED, sumados con saturación como en FastLED. */
export const frame = new Float32Array(NUM_LEDS * 3);

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function easeBezier(u: number, a: number, b: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const x1 = a, x2 = 1 - b;
  let t = u;
  for (let i = 0; i < 8; i++) {
    const mt = 1 - t;
    const x = 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t;
    const dx = 3 * mt * mt * x1 + 6 * mt * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (dx < 1e-5) break;
    t = clamp01(t - (x - u) / dx);
  }
  const mt = 1 - t;
  return 3 * mt * t * t + t * t * t;
}
export function easeExpOut(u: number, k: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return (1 - Math.exp(-k * u)) / (1 - Math.exp(-k));
}
export function easeExpInRaw(u: number, k: number): number {
  if (u <= 0) return 0;
  return (Math.exp(k * u) - 1) / (Math.exp(k) - 1);
}
export const easeInPow = (u: number, p: number) => Math.pow(clamp01(u), p);
export function ramp(t: number, t0: number, dur: number): number {
  if (dur <= 0) return t >= t0 ? 1 : 0;
  return clamp01((t - t0) / dur);
}

function ledIndex(i: number): number {
  i %= NUM_LEDS;
  if (i < 0) i += NUM_LEDS;
  return i;
}
function addPixel(i: number, p: number, col: RGB): void {
  if (p <= 0) return;
  if (p > 1) p = 1;
  const l = gammaLUT[Math.round(p * 255)];
  if (l === 0) return;
  const k = ledIndex(i) * 3;
  frame[k] = Math.min(1, frame[k] + col[0] * l);
  frame[k + 1] = Math.min(1, frame[k + 1] + col[1] * l);
  frame[k + 2] = Math.min(1, frame[k + 2] + col[2] * l);
}
export function clearFrame(): void { frame.fill(0); }

export function drawComet(head: number, dir: number, tailLen: number, clamped: boolean, origin: number, intensity: number, col: RGB): void {
  if (intensity <= 0) return;
  let maxBack = HEAD_W + tailLen;
  if (clamped) {
    const avail = dir * (head - origin);
    if (avail < maxBack) maxBack = avail;
  }
  if (maxBack < 0) return;
  const n = Math.floor(maxBack) + 2;
  const base = Math.floor(head);
  for (let k = -1; k <= n; k++) {
    const i = base - dir * k;
    const d = dir * (head - i);
    if (d < -0.5 || d > maxBack + 0.5) continue;
    let p: number;
    if (d < 0.5) p = d + 0.5;
    else if (d <= HEAD_W) p = 1;
    else {
      const x = (d - HEAD_W) / (tailLen > 0.01 ? tailLen : 0.01);
      if (x >= 1) continue;
      p = curveLUT[Math.floor(x * 128)];
    }
    if (d > maxBack - 0.5) p *= clamp01(maxBack + 0.5 - d);
    addPixel(i, p * intensity, col);
  }
}

export function cometRun(tLocal: number, origin: number, distance: number, dir: number, travelMs: number, ease: (u: number) => number, tail: number, retractMs: number, intensity: number, col: RGB): void {
  if (tLocal < 0) return;
  if (tLocal < travelMs) {
    const u = ease(tLocal / travelMs);
    drawComet(origin + dir * u * distance, dir, tail, true, origin, intensity, col);
  } else {
    const v = ramp(tLocal, travelMs, retractMs);
    drawComet(origin + dir * distance, dir, tail * (1 - v), false, 0, intensity, col);
  }
}

export function drawPulse(center: number, width: number, rampLen: number, intensity: number, col: RGB): void {
  if (intensity <= 0) return;
  const half = width * 0.5;
  if (rampLen < 0.5) rampLen = 0.5;
  const from = Math.floor(center - half) - 1;
  const to = Math.ceil(center + half) + 1;
  for (let i = from; i <= to; i++) {
    const edge = half - Math.abs(i - center);
    if (edge < -0.5) continue;
    addPixel(i, clamp01((edge + 0.5) / rampLen) * intensity, col);
  }
}

export function fillAll(intensity: number, col: RGB): void {
  for (let i = 0; i < NUM_LEDS; i++) addPixel(i, intensity, col);
}

// ---------------------------------------------------------------- secuencias (de src/sketches/seqNN.ino)

export interface Sequence { id: string; name: string; duration: number; draw(t: number): void; }

const seq01: Sequence = (() => {
  const TAIL = DEG(131), A_FADE = 1000, A_HOLD = 1300, A_TRAVEL = 8300, A_RETRACT = 5470, A_HOLD_END = 600;
  const B_COUNT = 2, B_SPACING = 1800, B_TRAVEL = 4400, B_K = 3, B_RETRACT = 3000, B_HOLD_END = 700;
  const C_TRAVEL = 2700, C_K = 3, C_RETRACT = 5470, C_HOLD_END = 600;
  const duration = A_FADE + A_HOLD + A_TRAVEL + A_RETRACT + A_HOLD_END + (B_COUNT - 1) * B_SPACING + B_TRAVEL + B_RETRACT + B_HOLD_END + C_TRAVEL + C_RETRACT + C_HOLD_END;
  return {
    id: 'seq01', name: 'Secuencia 01 · Cometa 360', duration,
    draw(t) {
      const col = WHITE; let e: number;
      if (t < (e = A_FADE)) { drawPulse(0, HEAD_W, 0.5, ramp(t, 0, e), col); return; }
      t -= e;
      if (t < (e = A_HOLD)) { drawPulse(0, HEAD_W, 0.5, 1, col); return; }
      t -= e;
      if (t < (e = A_TRAVEL + A_RETRACT)) { cometRun(t, 0, NUM_LEDS, CW, A_TRAVEL, (u) => easeBezier(u, 0.5, 0.5), TAIL, A_RETRACT, 1, col); return; }
      t -= e;
      if (t < (e = A_HOLD_END)) { drawPulse(0, HEAD_W, 0.5, 1, col); return; }
      t -= e;
      if (t < (e = (B_COUNT - 1) * B_SPACING + B_TRAVEL + B_RETRACT)) {
        if (t < (B_COUNT - 1) * B_SPACING) drawPulse(0, HEAD_W, 0.5, 1, col);
        for (let j = 0; j < B_COUNT; j++) cometRun(t - j * B_SPACING, NUM_LEDS, NUM_LEDS, CCW, B_TRAVEL, (u) => easeExpOut(u, B_K), TAIL, B_RETRACT, 1, col);
        return;
      }
      t -= e;
      if (t < (e = B_HOLD_END)) { drawPulse(0, HEAD_W, 0.5, 1, col); return; }
      t -= e;
      if (t < (e = C_TRAVEL + C_RETRACT)) { cometRun(t, 0, NUM_LEDS, CW, C_TRAVEL, (u) => easeExpOut(u, C_K), TAIL, C_RETRACT, 1, col); return; }
      drawPulse(0, HEAD_W, 0.5, 1, col);
    },
  };
})();

const seq03: Sequence = (() => {
  const TAIL = DEG(80), ORIGINS = 2, FADE_IN = 1000, HOLD = 1300, EXPAND = 4900, EXP_IN = 0.6, EXP_OUT = 0.05, MERGE_HOLD = 700, RETRACT = 2400, DOT_HOLD = 1900;
  const BAR = DEG(80), BAR_RAMP = DEG(20), BAR_FADE_IN = 2500, BAR_HOLD = 1600, BAR_TRAVEL = DEG(135), BAR_TRAVEL_MS = 4500, BAR_FADE_OUT = 1300, END_DOT = 1500, END_FADE = 1000, DARK = 500;
  const duration = FADE_IN + HOLD + EXPAND + MERGE_HOLD + RETRACT + DOT_HOLD + BAR_FADE_IN + BAR_HOLD + BAR_TRAVEL_MS + BAR_FADE_OUT + END_DOT + END_FADE + DARK;
  const spacing = NUM_LEDS / ORIGINS, half = spacing / 2;
  return {
    id: 'seq03', name: 'Secuencia 03 · Expansión simétrica', duration,
    draw(t) {
      const col = WHITE; let e: number;
      if (t < (e = FADE_IN)) { for (let j = 0; j < ORIGINS; j++) drawPulse(j * spacing, HEAD_W, 0.5, ramp(t, 0, e), col); return; }
      t -= e;
      if (t < (e = HOLD)) { for (let j = 0; j < ORIGINS; j++) drawPulse(j * spacing, HEAD_W, 0.5, 1, col); return; }
      t -= e;
      if (t < (e = EXPAND + MERGE_HOLD + RETRACT)) {
        for (let j = 0; j < ORIGINS; j++) {
          const o = j * spacing;
          if (t < EXPAND + MERGE_HOLD) {
            const u = easeBezier(t / EXPAND, EXP_IN, EXP_OUT);
            drawComet(o + u * half, CW, TAIL, true, o, 1, col);
            drawComet(o - u * half, CCW, TAIL, true, o, 1, col);
          } else {
            const v = ramp(t, EXPAND + MERGE_HOLD, RETRACT);
            drawComet(o + half, CW, TAIL * (1 - v), false, 0, 1, col);
            drawComet(o - half, CCW, TAIL * (1 - v), false, 0, 1, col);
          }
        }
        return;
      }
      t -= e;
      if (t < (e = DOT_HOLD)) { for (let j = 0; j < ORIGINS; j++) drawPulse(j * spacing + half, HEAD_W, 0.5, 1, col); return; }
      t -= e;
      if (t < (e = BAR_FADE_IN)) { for (let j = 0; j < ORIGINS; j++) { drawPulse(j * spacing + half, HEAD_W, 0.5, 1, col); drawPulse(j * spacing + half, BAR, BAR_RAMP, ramp(t, 0, e), col); } return; }
      t -= e;
      if (t < (e = BAR_HOLD)) { for (let j = 0; j < ORIGINS; j++) drawPulse(j * spacing + half, BAR, BAR_RAMP, 1, col); return; }
      t -= e;
      if (t < (e = BAR_TRAVEL_MS)) { const u = easeBezier(t / BAR_TRAVEL_MS, 0.5, 0.5); for (let j = 0; j < ORIGINS; j++) drawPulse(j * spacing + half + u * BAR_TRAVEL, BAR, BAR_RAMP, 1, col); return; }
      t -= e;
      if (t < (e = BAR_FADE_OUT)) { for (let j = 0; j < ORIGINS; j++) { const c = j * spacing + half + BAR_TRAVEL; drawPulse(c, BAR, BAR_RAMP, 1 - ramp(t, 0, e), col); drawPulse(c, HEAD_W, 0.5, 1, col); } return; }
      t -= e;
      if (t < (e = END_DOT)) { for (let j = 0; j < ORIGINS; j++) drawPulse(j * spacing + half + BAR_TRAVEL, HEAD_W, 0.5, 1, col); return; }
      t -= e;
      if (t < (e = END_FADE)) { for (let j = 0; j < ORIGINS; j++) drawPulse(j * spacing + half + BAR_TRAVEL, HEAD_W, 0.5, 1 - ramp(t, 0, e), col); }
    },
  };
})();

const seq055: Sequence = (() => {
  const PULSE = DEG(30), PULSE_RAMP = DEG(15), LAPS = 5, SPIN = 7700, BRAKE = 3, DOT_FADE = 700, GROW_AT = 2050, GROW = 300, BODY_FADE = 1300, SPIN_FADE_OUT = 800;
  const FLASH_DELAY = 300, FLASH_FADE = 3000, P2_DARK = 200, P2_COUNT = 2, P2_START = DEG(6), P2_DOT_FADE = 700, P2_ACCEL = 9500, P2_ACCEL_DEG = DEG(860), P2_K = 3.4, P2_GROW_AT = 1700, P2_GROW = 300, P2_BODY = 1000;
  const FILL_IN = 3000, FULL_HOLD = 2100, FULL_FADE = 2000, END_DARK = 300;
  const duration = SPIN + FLASH_DELAY + FLASH_FADE + P2_DARK + P2_ACCEL + FILL_IN + FULL_HOLD + FULL_FADE + END_DARK;
  const growing = (pos: number, grown: number, body: number, intensity: number) => {
    const w = HEAD_W + (PULSE - HEAD_W) * grown, r = 0.5 + (PULSE_RAMP - 0.5) * grown;
    drawPulse(pos, HEAD_W, 0.5, intensity, WHITE);
    if (grown > 0) drawPulse(pos, w, r, body * intensity, WHITE);
  };
  return {
    id: 'seq055', name: 'Secuencia 05.5 · Giro, flash y aceleración', duration,
    draw(t) {
      let e: number;
      if (t < (e = SPIN)) {
        const pos = LAPS * NUM_LEDS * easeExpOut(t / SPIN, BRAKE);
        const fade = ramp(t, 0, DOT_FADE) * (1 - ramp(t, SPIN - SPIN_FADE_OUT, SPIN_FADE_OUT));
        growing(pos, ramp(t, GROW_AT, GROW), ramp(t, GROW_AT, BODY_FADE), fade);
        return;
      }
      t -= e;
      if (t < (e = FLASH_DELAY)) return;
      t -= e;
      if (t < (e = FLASH_FADE)) { fillAll(1 - ramp(t, 0, e), WHITE); return; }
      t -= e;
      if (t < (e = P2_DARK)) return;
      t -= e;
      if (t < (e = P2_ACCEL + FILL_IN)) {
        const adv = P2_ACCEL_DEG * easeExpInRaw(t / P2_ACCEL, P2_K);
        const spacing = NUM_LEDS / P2_COUNT;
        for (let j = 0; j < P2_COUNT; j++) growing(P2_START + j * spacing + adv, ramp(t, P2_GROW_AT, P2_GROW), ramp(t, P2_GROW_AT, P2_BODY), ramp(t, 0, P2_DOT_FADE));
        if (t >= P2_ACCEL) fillAll(ramp(t, P2_ACCEL, FILL_IN), WHITE);
        return;
      }
      t -= e;
      if (t < (e = FULL_HOLD)) { fillAll(1, WHITE); return; }
      t -= e;
      if (t < (e = FULL_FADE)) { fillAll(1 - ramp(t, 0, e), WHITE); }
    },
  };
})();

const seq06: Sequence = (() => {
  const A_COUNT = 3, A_WIDTH = DEG(30), A_RAMP = DEG(15), A_START = DEG(32), A_FADE_IN = 1500, A_ACCEL = 13300, A_ACCEL_DEG = DEG(660), A_POW = 2.6, A_FADE_OUT = 1300, A_DARK = 700;
  const COLS: RGB[] = [hex(0x40a0ff), hex(0xff0000), hex(0x00ff00)];
  const B_WIDTH = DEG(80), B_RAMP = DEG(32), B_START = DEG(28), B_FADE_IN = 1300, B_HOLD = 1400, B_TRAVEL = DEG(720), B_TRAVEL_MS = 11500, B_FADE_OUT = 1300, B_DARK = 700;
  const duration = A_ACCEL + A_DARK + B_FADE_IN + B_HOLD + B_TRAVEL_MS + B_DARK;
  const arcs = (advance: number, intensity: number) => { for (let j = 0; j < 3; j++) drawPulse(B_START + j * (NUM_LEDS / 3) + advance, B_WIDTH, B_RAMP, intensity, COLS[j]); };
  return {
    id: 'seq06', name: 'Secuencia 06 · Tres pulsos y tricolor', duration,
    draw(t) {
      let e: number;
      if (t < (e = A_ACCEL)) {
        const adv = A_ACCEL_DEG * easeInPow(t / A_ACCEL, A_POW);
        const fade = ramp(t, 0, A_FADE_IN) * (1 - ramp(t, A_ACCEL - A_FADE_OUT, A_FADE_OUT));
        const spacing = NUM_LEDS / A_COUNT;
        for (let j = 0; j < A_COUNT; j++) drawPulse(A_START + j * spacing + adv, A_WIDTH, A_RAMP, fade, WHITE);
        return;
      }
      t -= e;
      if (t < (e = A_DARK)) return;
      t -= e;
      if (t < (e = B_FADE_IN)) { arcs(0, ramp(t, 0, e)); return; }
      t -= e;
      if (t < (e = B_HOLD)) { arcs(0, 1); return; }
      t -= e;
      if (t < (e = B_TRAVEL_MS)) { const u = easeBezier(t / B_TRAVEL_MS, 0.42, 0.58); arcs(u * B_TRAVEL, 1 - ramp(t, B_TRAVEL_MS - B_FADE_OUT, B_FADE_OUT)); }
    },
  };
})();

export const SEQUENCES: Sequence[] = [seq01, seq03, seq055, seq06];

/** Dibuja el fotograma de la secuencia en el instante t (ms, se repite en bucle). */
export function renderSequence(seq: Sequence, tMs: number): Float32Array {
  clearFrame();
  seq.draw(tMs % seq.duration);
  return frame;
}
