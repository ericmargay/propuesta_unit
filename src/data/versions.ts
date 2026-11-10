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
  /** cilindro en lugar de caja */
  round?: boolean;
  price?: number;
  link?: string;
  note?: string;
  /** segunda línea de la etiqueta cuando no hay precio */
  tag?: string;
}

export const COMPONENTS: Record<string, ComponentDef> = {
  mac: { id: 'mac', name: 'Mac · Ableton Live', tag: 'puente MIDI → red', size: [200, 140, 10], color: 0xa9a9ae, note: 'Live manda notas y CC por el IAC Driver; el puente (Node) los convierte en cues de 8 bytes' },
  arturia: { id: 'arturia', name: 'Interfaz Arturia', size: [100, 100, 40], color: 0x3a3a42, note: 'la salida de línea va a los monitores' },
  krk: { id: 'krk', name: 'Monitores KRK Rokit 5', size: [90, 110, 140], color: 0x1d1d22, note: 'en el techo o a la altura de la obra (aquí a escala reducida)' },
  s3: { id: 's3', name: 'ESP32-S3 SuperMini', tag: 'en la obra · GPIO 7', size: [22, 18, 5], color: 0x1f6fb0, link: 'https://uelectronics.com/producto/esp32-s3-supermini-placa-de-desarrollo-usb-tipo-c/', note: 'en una esquina de la caja; corre las secuencias con FastLED y saca el dato por el GPIO 7' },
  psu5: { id: 'psu5', name: 'Fuente 5 V · 20 A', tag: 'ya en la obra', size: [215, 115, 50], color: 0xb9b9bd, note: 'la tira pide como máximo ≈ 7,2 A' },
  fuse: { id: 'fuse', name: 'Fusible 10 A', size: [40, 12, 12], color: 0xb03a2e, price: 25, note: 'a la salida de la fuente: un corto con 20 A disponibles quema las pistas de la tira' },
  proto: { id: 'proto', name: 'Mini protoboard 170', size: [47, 35, 9], color: 0xeeeeee, price: 20, link: 'https://uelectronics.com/producto/mini-protoboard-170-pts/', note: 'lleva el 74AHCT125, el 100 nF y las resistencias junto a la ESP32-S3' },
  shifter: { id: 'shifter', name: '74AHCT125 · 3,3 → 5 V', size: [20, 8, 5], color: 0x55555c, price: 25, note: 'la WS2812B a 5 V pide al menos 3,5 V en el dato; luego 330 Ω y 1000 µF en la entrada de la tira' },
  obra: { id: 'obra', name: 'La obra', tag: 'WS2812B · 120 LEDs', size: [180, 180, 30], color: 0xe8e4dc, note: 'cuadro de 60 × 60 cm; aquí a escala 3:10' },
  dfplayer: { id: 'dfplayer', name: 'DFPlayer Mini', size: [21, 21, 6], color: 0x2b7a3c, price: 45, link: 'https://uelectronics.com/producto/dfplayer-mini-reproductor-mp3-mh2024k-24ss/', note: 'reproduce 0001.mp3 de la microSD al recibir la orden de la ESP32-S3 por su UART1 (GPIO 9)' },
  jack: { id: 'jack', name: 'Jack 3,5 mm estéreo', size: [12, 12, 20], color: 0x55555c, price: 15, note: 'en el canto de la caja, con la salida de línea DAC_L/DAC_R del DFPlayer; sin bocinas dentro de la obra' },
  audioSys: { id: 'audioSys', name: 'Equipo de audio', tag: 'por definir', size: [120, 90, 70], color: 0x3a3a42, note: 'bocinas amplificadas, monitores o el sistema de la sala; llega por un cable de 3,5 mm de 5–10 m' },
  w5500: { id: 'w5500', name: 'W5500 Lite · Ethernet', size: [36, 23, 14], color: 0x245d9e, price: 95, link: 'https://uelectronics.com/producto/w5500-convertidor-ethernet-spi-a-lan/', note: 'se conecta a la ESP32-S3 de la obra (CS en GPIO 10, SPI en 11/12/13)' },
  c3: { id: 'c3', name: 'ESP32-C3 · transmisor', size: [22, 18, 5], color: 0x1f6fb0, price: 90, link: 'https://uelectronics.com/producto/esp32-c3-supermini-tipo-c-tarjeta-de-expansion/', note: 'recibe los cues por USB-serie y los manda por radio' },
  nrfTx: { id: 'nrfTx', name: 'nRF24 · transmisor', size: [41, 16, 12], color: 0x6b3fa0, price: 85, note: '2,4 GHz a 2 Mbps, con antena; alcance de sala con margen' },
  nrfRx: { id: 'nrfRx', name: 'nRF24 · receptor', size: [41, 16, 12], color: 0x6b3fa0, price: 85, note: 'en la obra, junto a la ESP32-S3 (CE 4, CSN 5)' },
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

// La base de la versión 0 va en todas: fuente → fusible → ESP32-S3 → 74AHCT125 (en la mini protoboard) → obra.
// `dx` corre la base a la derecha cuando la Mac y la interfaz ocupan la izquierda (versiones 2–4).
const base = (dx: number, psuRow = 1.6): Placement[] => [
  { id: 'psu5', col: 0.7 + dx, row: psuRow },
  { id: 'fuse', col: 1.85 + dx, row: psuRow },
  { id: 's3', col: 2.25 + dx, row: 0 },
  { id: 'proto', col: 2.95 + dx, row: 0.95 },
  { id: 'shifter', col: 3.55 + dx, row: 0 },
  { id: 'obra', col: 4.75 + dx, row: 0 },
];
const baseLinks: Link[] = [
  { from: 'psu5', to: 'fuse', kind: 'power' },
  { from: 'fuse', to: 's3', kind: 'power' },
  { from: 'fuse', to: 'obra', kind: 'power' },
  { from: 's3', to: 'shifter', kind: 'data' },
  { from: 'shifter', to: 'obra', kind: 'data' },
];
const monitors: Placement[] = [{ id: 'mac', col: 0, row: 0 }, { id: 'arturia', col: 0, row: 1.2 }, { id: 'krk', col: -0.3, row: -1.3 }];
const monitorLinks: Link[] = [{ from: 'mac', to: 'arturia', kind: 'usb' }, { from: 'arturia', to: 'krk', kind: 'audio' }];

export const VERSIONS: Version[] = [
  {
    id: 'v0', short: 'V0', name: 'Versión 0 · La obra hoy', latency: '—', sync: 'Sin música',
    summary: 'La ESP32-S3 SuperMini, en una esquina de la caja, corre sola las secuencias medidas de los videos originales. Es la obra que existe, con su simulador, su VM de Arduino en el navegador y su exportación de video. Le falta su protección: un 74AHCT125 que sube el dato de 3,3 V a 5 V, la resistencia de 330 Ω y el capacitor de 1000 µF en la entrada de la tira, y un fusible de 10 A frente a los 20 A de la fuente, todo en una mini protoboard. Es la base de las otras cuatro versiones.',
    status: 'Construida; falta la protección (≈ MXN 130)',
    placements: base(0),
    links: baseLinks,
  },
  {
    id: 'v1', short: 'V1', name: 'Versión 1 · Música grabada', latency: '~150 ms fijos, compensados', sync: 'DFPlayer Mini en la microSD',
    summary: 'La ESP32-S3 manda «reproducir pista» al DFPlayer por su UART1 al arrancar el show y adelanta su reloj 150 ms: la música y la luz parten juntas. Las secuencias se diseñan sobre la pista en el simulador. El DFPlayer va dentro de la caja, sin bocinas: su salida de línea sale por un jack de 3,5 mm y un cable largo hasta el equipo de audio, que está por definir.',
    status: 'Firmware y simulador listos; falta el hardware',
    placements: [...base(0), { id: 'dfplayer', col: 3.05, row: 1.8 }, { id: 'jack', col: 4.15, row: 1.8 }, { id: 'audioSys', col: 5.5, row: 1.8 }],
    links: [...baseLinks, { from: 's3', to: 'dfplayer', kind: 'serial' }, { from: 'dfplayer', to: 'jack', kind: 'audio' }, { from: 'jack', to: 'audioSys', kind: 'audio' }],
  },
  {
    id: 'v2', short: 'V2', name: 'Versión 2 · Ethernet', latency: '1–3 ms, sin jitter', sync: 'Ableton Live → UDP por cable',
    summary: 'Ableton Live toca la música y manda notas MIDI; el puente en la Mac las convierte en cues de 8 bytes que viajan por cable a un W5500 Lite conectado a la ESP32-S3 de la obra. Cada nota despierta una secuencia, un color, un grupo de píxeles o un flash: la luz y el sonido comparten la misma partitura.',
    status: 'Firmware, puente y mapa MIDI escritos; falta el hardware',
    placements: [...monitors, ...base(0.6, 2.2), { id: 'w5500', col: 1.6, row: 0 }],
    links: [...monitorLinks, ...baseLinks, { from: 'mac', to: 'w5500', kind: 'eth' }, { from: 'w5500', to: 's3', kind: 'data' }],
  },
  {
    id: 'v3', short: 'V3', name: 'Versión 3 · Wi-Fi', latency: '5–30 ms, picos de 100 ms', sync: 'Ableton Live → UDP por Wi-Fi',
    summary: 'La misma partitura, sin cable y sin piezas nuevas: la ESP32-S3 de la obra ya tiene Wi-Fi. Sirve para medir cuánto jitter tolera la percepción antes de pasar a la radio; el puente mide la latencia con 200 pings.',
    status: 'Firmware y puente listos; no necesita piezas',
    placements: [...monitors, ...base(0.6, 2.2)],
    links: [...monitorLinks, ...baseLinks, { from: 'mac', to: 's3', kind: 'wifi' }],
  },
  {
    id: 'v4', short: 'V4', name: 'Versión 4 · Radio nRF24', latency: '1–2 ms, sin red de por medio', sync: 'Ableton Live → USB → radio 2,4 GHz',
    summary: 'Inalámbrica y determinista: un ESP32-C3 junto a la Mac manda cada cue por un nRF24L01+ con antena; el receptor es la ESP32-S3 de la obra, que responde con el eco y el puente sabe la latencia exacta. Es la versión para presentar en vivo.',
    status: 'Firmware del transmisor y del receptor escritos; falta el hardware',
    placements: [...monitors, ...base(0.6, 2.2), { id: 'c3', col: 1.3, row: 0.8 }, { id: 'nrfTx', col: 1.3, row: -0.9 }, { id: 'nrfRx', col: 2.4, row: -0.9 }],
    links: [...monitorLinks, ...baseLinks, { from: 'mac', to: 'c3', kind: 'usb' }, { from: 'c3', to: 'nrfTx', kind: 'data' }, { from: 'nrfTx', to: 'nrfRx', kind: 'radio' }, { from: 'nrfRx', to: 's3', kind: 'data' }],
  },
];
