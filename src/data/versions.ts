// Las cinco versiones de Shadows & Lights: la 0 es la obra tal como corre hoy; la 1 añade música grabada; la 2, 3 y 4
// la sincronizan con Ableton Live por cable, Wi-Fi y radio. Los componentes se dibujan en la mesa 3D (audio.ts) con
// sus medidas reales en mm (las piezas muy chicas se muestran con un mínimo de 30 mm para que se vean).

export type LinkKind = 'power' | 'data' | 'serial' | 'audio' | 'eth' | 'wifi' | 'radio' | 'usb';

export interface ComponentDef {
  id: string;
  name: string;
  /** ancho × fondo × alto en mm (ancho en x, fondo en z, alto en y) */
  size: [number, number, number];
  color: number;
  /** cilindro en lugar de caja (bocinas) */
  round?: boolean;
  price?: number;
  link?: string;
  note?: string;
}

export const COMPONENTS: Record<string, ComponentDef> = {
  mac: { id: 'mac', name: 'Mac · Ableton Live + puente MIDI→red', size: [200, 140, 10], color: 0xa9a9ae, note: 'Live manda notas y CC por el IAC Driver; el puente (Node) los convierte en cues de 8 bytes' },
  arturia: { id: 'arturia', name: 'Interfaz de audio Arturia', size: [100, 100, 40], color: 0x3a3a42, note: 'la salida de línea va a los monitores' },
  krk: { id: 'krk', name: 'Monitores KRK Rokit 5 G3', size: [90, 110, 140], color: 0x1d1d22, note: 'en el techo o a la altura de la obra (aquí a escala reducida)' },
  mega: { id: 'mega', name: 'Arduino Mega 2560', size: [101, 53, 14], color: 0x1f6fb0, note: 'corre las secuencias con FastLED (versión 0)' },
  psu5: { id: 'psu5', name: 'Fuente 5 V 10 A', size: [160, 98, 38], color: 0xb9b9bd, price: 220, note: 'tira + controlador' },
  obra: { id: 'obra', name: 'La obra · tira WS2812B de 120 LEDs', size: [180, 180, 30], color: 0xe8e4dc, note: 'cuadro de 60 × 60 cm; aquí a escala 3:10' },
  dfplayer: { id: 'dfplayer', name: 'DFPlayer Mini MH2024K-24SS', size: [21, 21, 6], color: 0x2b7a3c, price: 45, link: 'https://uelectronics.com/producto/dfplayer-mini-reproductor-mp3-mh2024k-24ss/', note: 'reproduce 0001.mp3 de la microSD al recibir la orden del Mega por TX1' },
  speaker: { id: 'speaker', name: 'Bocina 4 Ω 3 W', size: [40, 40, 20], color: 0x26262a, round: true, price: 35, link: 'https://uelectronics.com/producto/bocinas-4-y-8-ohm/', note: 'dentro del cuadro, a SPK1/SPK2' },
  pam: { id: 'pam', name: 'UNIT PAM8403 · 3 W + 3 W', size: [20, 18, 6], color: 0x2b7a3c, price: 35, link: 'https://uelectronics.com/producto/unit-pam8403-amplificador-de-audio/', note: 'dos bocinas en estéreo desde DAC_L/DAC_R' },
  jack: { id: 'jack', name: 'Jack 3,5 mm estéreo → interfaz', size: [12, 12, 20], color: 0x55555c, price: 15, note: 'variante «caja aparte»: la señal de línea viaja por cable a la interfaz y los monitores' },
  wt32: { id: 'wt32', name: 'WT32-ETH01 · ESP32 + Ethernet', size: [55, 26, 14], color: 0x1f6fb0, price: 190, link: 'https://uelectronics.com/producto/wt32-eth01-placa-de-desarrollo-esp32-con-ethernet/', note: 'recibe los cues por UDP y dibuja la tira; se programa con un adaptador USB-serie' },
  s3: { id: 's3', name: 'ESP32-S3 SuperMini', size: [22, 18, 5], color: 0x1f6fb0, price: 120, link: 'https://uelectronics.com/producto/esp32-s3-supermini-placa-de-desarrollo-usb-tipo-c/', note: '22 × 18 mm, USB-C, Wi-Fi; el mismo firmware show_remote con otro transporte' },
  c3: { id: 'c3', name: 'ESP32-C3 SuperMini · transmisor', size: [22, 18, 5], color: 0x1f6fb0, price: 90, link: 'https://uelectronics.com/producto/esp32-c3-supermini-tipo-c-tarjeta-de-expansion/', note: 'recibe los cues por USB-serie y los manda por radio' },
  shifter: { id: 'shifter', name: '74AHCT125 · 3,3 V → 5 V', size: [20, 8, 5], color: 0x55555c, price: 25, note: 'la tira quiere datos de 5 V' },
  nrfTx: { id: 'nrfTx', name: 'nRF24L01+ PA LNA · transmisor', size: [41, 16, 12], color: 0x6b3fa0, price: 85, note: '2,4 GHz a 2 Mbps, con antena; alcance de sala con margen' },
  nrfRx: { id: 'nrfRx', name: 'nRF24L01+ PA LNA · receptor', size: [41, 16, 12], color: 0x6b3fa0, price: 85, note: 'en la obra, junto al ESP32-S3' },
};

export interface Placement { id: string; col: number; row: number; }
export interface Link { from: string; to: string; kind: LinkKind; }

export interface Version {
  id: string;
  short: string;
  name: string;
  latency: string;
  sync: string;
  summary: string;
  status: string;
  placements: Placement[];
  links: Link[];
}

// mac / audio siempre a la izquierda; la obra a la derecha
const monitors: Placement[] = [{ id: 'mac', col: 0, row: 0 }, { id: 'arturia', col: 0, row: 1.1 }, { id: 'krk', col: -0.3, row: -1.3 }];
const monitorLinks: Link[] = [{ from: 'mac', to: 'arturia', kind: 'usb' }, { from: 'arturia', to: 'krk', kind: 'audio' }];

export const VERSIONS: Version[] = [
  {
    id: 'v0', short: 'V0', name: 'Versión 0 · La obra hoy', latency: '—', sync: 'Sin música',
    summary: 'El Arduino Mega 2560 corre solo las seis secuencias medidas de los videos originales. Es la obra que existe, con su simulador, su VM de Arduino en el navegador y su exportación de video. Todo lo demás se monta encima de esto.',
    status: 'Construida y funcionando',
    placements: [{ id: 'psu5', col: 1.4, row: 1.2 }, { id: 'mega', col: 2.4, row: 0 }, { id: 'obra', col: 4.2, row: 0 }],
    links: [{ from: 'psu5', to: 'mega', kind: 'power' }, { from: 'psu5', to: 'obra', kind: 'power' }, { from: 'mega', to: 'obra', kind: 'data' }],
  },
  {
    id: 'v1', short: 'V1', name: 'Versión 1 · Música grabada', latency: '~150 ms fijos, compensados', sync: 'DFPlayer Mini en la microSD',
    summary: 'El Mega manda «reproducir pista» al DFPlayer al arrancar el show y adelanta su reloj 150 ms: la música y la luz parten juntas. Las secuencias se encajan a mano en la línea de tiempo del simulador. Bocina dentro del cuadro, o jack estéreo a la interfaz y los monitores si la electrónica va en una caja aparte.',
    status: 'Firmware y simulador listos; falta el hardware',
    placements: [{ id: 'psu5', col: 1.4, row: 1.2 }, { id: 'mega', col: 2.4, row: 0 }, { id: 'dfplayer', col: 2.4, row: 1.2 }, { id: 'speaker', col: 3.3, row: 1.2 }, { id: 'pam', col: 2.4, row: 2.2 }, { id: 'jack', col: 3.3, row: 2.2 }, { id: 'arturia', col: 4.2, row: 2.2 }, { id: 'krk', col: 5.4, row: 1.1 }, { id: 'obra', col: 4.2, row: 0 }],
    links: [{ from: 'psu5', to: 'mega', kind: 'power' }, { from: 'psu5', to: 'obra', kind: 'power' }, { from: 'mega', to: 'obra', kind: 'data' }, { from: 'mega', to: 'dfplayer', kind: 'serial' }, { from: 'dfplayer', to: 'speaker', kind: 'audio' }, { from: 'dfplayer', to: 'pam', kind: 'audio' }, { from: 'pam', to: 'jack', kind: 'audio' }, { from: 'jack', to: 'arturia', kind: 'audio' }, { from: 'arturia', to: 'krk', kind: 'audio' }],
  },
  {
    id: 'v2', short: 'V2', name: 'Versión 2 · Ethernet', latency: '1–3 ms, sin jitter', sync: 'Ableton Live → UDP por cable',
    summary: 'Ableton Live toca la música y manda notas MIDI; el puente en la Mac las convierte en cues de 8 bytes que viajan por cable al WT32-ETH01. Cada nota despierta una secuencia, un color, un grupo de píxeles o un flash: la luz y el sonido comparten la misma partitura.',
    status: 'Firmware, puente y mapa MIDI escritos; falta el hardware',
    placements: [...monitors, { id: 'wt32', col: 2.6, row: 0 }, { id: 'psu5', col: 2.6, row: 1.3 }, { id: 'shifter', col: 3.5, row: 0.6 }, { id: 'obra', col: 4.6, row: 0 }],
    links: [...monitorLinks, { from: 'mac', to: 'wt32', kind: 'eth' }, { from: 'psu5', to: 'wt32', kind: 'power' }, { from: 'psu5', to: 'obra', kind: 'power' }, { from: 'wt32', to: 'shifter', kind: 'data' }, { from: 'shifter', to: 'obra', kind: 'data' }],
  },
  {
    id: 'v3', short: 'V3', name: 'Versión 3 · Wi-Fi', latency: '5–30 ms, picos de 100 ms', sync: 'Ableton Live → UDP por Wi-Fi',
    summary: 'La misma partitura, sin cable: el ESP32-S3 SuperMini (22 × 18 mm) cabe en cualquier rincón del cuadro. Sirve para medir cuánto jitter tolera la percepción antes de pasar a la radio; el puente mide la latencia con 200 pings.',
    status: 'Firmware y puente listos; falta el hardware',
    placements: [...monitors, { id: 's3', col: 2.6, row: 0 }, { id: 'psu5', col: 2.6, row: 1.3 }, { id: 'shifter', col: 3.5, row: 0.6 }, { id: 'obra', col: 4.6, row: 0 }],
    links: [...monitorLinks, { from: 'mac', to: 's3', kind: 'wifi' }, { from: 'psu5', to: 's3', kind: 'power' }, { from: 'psu5', to: 'obra', kind: 'power' }, { from: 's3', to: 'shifter', kind: 'data' }, { from: 'shifter', to: 'obra', kind: 'data' }],
  },
  {
    id: 'v4', short: 'V4', name: 'Versión 4 · Radio nRF24', latency: '1–2 ms, sin red de por medio', sync: 'Ableton Live → USB → radio 2,4 GHz',
    summary: 'Inalámbrica y determinista: un ESP32-C3 junto a la Mac manda cada cue por un nRF24L01+ con antena; el receptor en la obra responde con el eco y el puente sabe la latencia exacta. Es la versión para presentar en vivo.',
    status: 'Firmware del transmisor y del receptor escritos; falta el hardware',
    placements: [...monitors, { id: 'c3', col: 1.1, row: 0 }, { id: 'nrfTx', col: 1.75, row: 0 }, { id: 'nrfRx', col: 2.8, row: 0.6 }, { id: 's3', col: 3.6, row: -0.45 }, { id: 'psu5', col: 3.1, row: 1.3 }, { id: 'shifter', col: 4.1, row: 0.6 }, { id: 'obra', col: 5.1, row: 0 }],
    links: [...monitorLinks, { from: 'mac', to: 'c3', kind: 'usb' }, { from: 'c3', to: 'nrfTx', kind: 'data' }, { from: 'nrfTx', to: 'nrfRx', kind: 'radio' }, { from: 'nrfRx', to: 's3', kind: 'data' }, { from: 'psu5', to: 's3', kind: 'power' }, { from: 'psu5', to: 'obra', kind: 'power' }, { from: 's3', to: 'shifter', kind: 'data' }, { from: 'shifter', to: 'obra', kind: 'data' }],
  },
];
