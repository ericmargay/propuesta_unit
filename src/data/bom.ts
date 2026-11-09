// Listas de piezas por proyecto. Precios en MXN orientativos (fichas indexadas de UNIT, noviembre de 2026; se
// confirman al pedir). `unit` = ficha encontrada en uelectronics.com; sin `unit`, se busca en tienda o se compra
// fuera. `key` identifica piezas iguales en distintas versiones para no contarlas dos veces.

export interface BomItem {
  name: string;
  qty: number;
  price: number | null;
  unit?: string; // enlace a la ficha de UNIT
  note?: string;
  key?: string;
  alt?: boolean; // alternativa: no suma
  outside?: boolean; // se compra fuera de UNIT
}

export interface BomGroup { id: string; title: string; items: BomItem[]; }

const U = (slug: string) => `https://uelectronics.com/producto/${slug}/`;

export const SHADOWS_BOM: BomGroup[] = [
  {
    id: 'v1', title: 'Versión 1 · música grabada (DFPlayer Mini)', items: [
      { name: 'DFPlayer Mini MH2024K-24SS', qty: 1, price: 45, unit: U('dfplayer-mini-reproductor-mp3-mh2024k-24ss'), key: 'dfplayer' },
      { name: 'Bocina 4 Ω 3 W', qty: 1, price: 35, unit: U('bocinas-4-y-8-ohm'), key: 'bocina' },
      { name: 'UNIT PAM8403 · 3 W + 3 W', qty: 1, price: 35, unit: U('unit-pam8403-amplificador-de-audio'), key: 'pam', note: 'estéreo desde DAC_L/DAC_R' },
      { name: 'Jack 3,5 mm estéreo hembra para chasis', qty: 1, price: 15, key: 'jack', note: 'salida de línea a la interfaz Arturia' },
      { name: 'microSD 8–32 GB', qty: 1, price: 90, key: 'sd' },
      { name: 'Capacitor 1000 µF', qty: 1, price: 6, unit: U('capacitor-electrolitico-50v'), key: 'cap1000' },
      { name: 'Resistencia 1 kΩ', qty: 1, price: 1, key: 'r1k' },
    ],
  },
  {
    id: 'v2', title: 'Versión 2 · Ethernet', items: [
      { name: 'WT32-ETH01 (ESP32 + LAN8720)', qty: 1, price: 190, unit: U('wt32-eth01-placa-de-desarrollo-esp32-con-ethernet'), key: 'wt32' },
      { name: 'Alternativa: ESP32-S3 SuperMini + W5500 Lite', qty: 1, price: 215, unit: U('w5500-convertidor-ethernet-spi-a-lan'), alt: true },
      { name: '74AHCT125 (3,3 V → 5 V)', qty: 1, price: 25, key: 'shifter' },
      { name: 'Adaptador USB-serie CP2102 3,3 V', qty: 1, price: 60, key: 'cp2102', note: 'el WT32-ETH01 no trae USB' },
      { name: 'Fuente 5 V 10 A', qty: 1, price: 220, key: 'psu5' },
      { name: 'Cable Ethernet Cat 5e 10 m', qty: 1, price: 60, key: 'eth', outside: true },
    ],
  },
  {
    id: 'v3', title: 'Versión 3 · Wi-Fi', items: [
      { name: 'ESP32-S3 SuperMini', qty: 1, price: 120, unit: U('esp32-s3-supermini-placa-de-desarrollo-usb-tipo-c'), key: 's3' },
      { name: 'Alternativa: ESP32 DevKitC V4', qty: 1, price: 145, unit: U('esp32-devkitc-v4-esp32-wroom-32d-32u'), alt: true },
      { name: '74AHCT125', qty: 1, price: 25, key: 'shifter' },
    ],
  },
  {
    id: 'v4', title: 'Versión 4 · radio nRF24L01+', items: [
      { name: 'nRF24L01+ PA LNA con antena', qty: 2, price: 85, key: 'nrf', note: 'por confirmar en UNIT' },
      { name: 'ESP32-C3 SuperMini (transmisor)', qty: 1, price: 90, unit: U('esp32-c3-supermini-tipo-c-tarjeta-de-expansion'), key: 'c3' },
      { name: 'ESP32-S3 SuperMini (receptor, el de la versión 3)', qty: 1, price: 120, unit: U('esp32-s3-supermini-placa-de-desarrollo-usb-tipo-c'), key: 's3' },
      { name: 'Capacitor 10–100 µF', qty: 2, price: 6, key: 'cap10' },
      { name: '74AHCT125', qty: 1, price: 25, key: 'shifter' },
    ],
  },
];

export const PRAXI_BOM: BomGroup[] = [
  {
    id: 'praxi-e', title: 'Electrónica y mecánica de la mesa de dos tambores', items: [
      { name: 'Motor NEMA 17 17HS8401', qty: 2, price: 225, unit: U('nema-17-motor-a-pasos-17hs8401') },
      { name: 'Driver DM542', qty: 2, price: 219 },
      { name: 'Fuente conmutada 24 V 5 A', qty: 1, price: 210, unit: U('fuente-conmutada-24v-5a') },
      { name: 'ESP32 DevKitC V4', qty: 1, price: 145, unit: U('esp32-devkitc-v4-esp32-wroom-32d-32u') },
      { name: 'UNIT Placa de expansión ESP32 38 pines', qty: 1, price: 89, unit: U('unit-placa-de-expansion-para-esp32-38-pines') },
      { name: 'Kit protoboard 830 + MB102 + jumpers', qty: 1, price: 150, unit: U('kit-protoboard-830-puntos-fuente-mb102-65-cables-dupont-m-m') },
      { name: 'Kit de resortes (200 piezas)', qty: 1, price: 162, unit: U('resortes-de-compresion-y-extension-200-piezas') },
      { name: 'Encoder magnético AS5600', qty: 1, price: 52, unit: U('as5600-encoder-magnetico-12-bits') },
      { name: 'Sensor de distancia VL53L0X', qty: 1, price: 47, unit: U('vl53l0x-medidor-de-distancia-laser-i2c-940nm-tof') },
      { name: 'Sensor de barrera F249', qty: 2, price: 20, unit: U('sensor-de-velocidad-f249-3-3v-5v') },
      { name: 'LED blanco frío 10 W', qty: 3, price: 26, unit: U('led-blanco-frio-de-potencia-10w-50w-y-100w') },
      { name: 'Regulador LM2596', qty: 2, price: 36, unit: U('modulo-regulador-ajustable-lm2596-dc-dc-step-down-3a-1-25-30v') },
      { name: 'MOSFET IRLZ44N', qty: 2, price: 12, unit: U('transistor-irlz44') },
      { name: 'Driver de compuerta IR2101', qty: 1, price: 50, unit: U('ir2101-driver-dip-8-ir2101pbf') },
      { name: 'Transistor S8050', qty: 5, price: 2, unit: U('transistor-npn-500ma-25v-s8050') },
      { name: 'Rodamiento 608ZZ', qty: 12, price: 8, unit: U('608zz-7-rodamiento-tipo-balero-de-8-x-22-x-7-mm') },
      { name: 'Cople flexible 5 × 8 mm', qty: 2, price: 33 },
      { name: 'Capacitor 1000 µF 50 V', qty: 3, price: 6, unit: U('capacitor-electrolitico-50v') },
      { name: 'Disipador 40 × 40 × 20, resistencia de aluminio 10 W, capacitores y resistencias', qty: 1, price: 82 },
      { name: 'Cable 18 AWG (5 m), cable AC, jumpers H-H y H-M, tira de pines', qty: 1, price: 236, unit: U('cables-dupont-extra-largos-30cm-hh-mh-mm') },
      { name: 'Sensor de mano VL53L4CD (SparkFun)', qty: 2, price: 500, outside: true, note: 'Amazon México; UNIT no lo tiene' },
    ],
  },
];

export const PRAXI_SERVICES = [
  { name: 'Impresión 3D en PETG', detail: '16 piezas distintas, 28 en total · 373 g · ≈ 16 h de máquina', estimate: 1277, unitService: 'servicio de impresión 3D de UNIT (desde $29/h)' },
  { name: 'Corte láser · MDF 5,5 mm', detail: '20 piezas · 15,8 m de corte · 1 hoja de 90 × 60', estimate: 480, unitService: 'servicio de corte láser de UNIT' },
  { name: 'Corte láser · acrílico transparente 3 mm', detail: '18 piezas · 10,7 m · 1 hoja de 90 × 60', estimate: 528, unitService: 'servicio de corte láser de UNIT' },
  { name: 'Corte láser · acrílico negro 3 mm', detail: '3 piezas · 0,6 m', estimate: 22, unitService: 'servicio de corte láser de UNIT' },
];

export const SIGNAGE_BOM: BomGroup[] = [
  {
    id: 'sig-luz', title: 'Luz y potencia de las cuatro letras', items: [
      { name: 'Tira WS2815 12 V 60 LED/m IP30 (rollo de 5 m)', qty: 4, price: 650, note: '18,1 m · 1086 LEDs; por confirmar en UNIT (o WS2812B con inyección)' },
      { name: 'ESP32-S3 SuperMini (controlador)', qty: 1, price: 120, unit: U('esp32-s3-supermini-placa-de-desarrollo-usb-tipo-c') },
      { name: '74AHCT125', qty: 1, price: 25 },
      { name: 'Fuente 12 V 30 A 360 W', qty: 1, price: 520 },
      { name: 'Regulador LM2596', qty: 1, price: 36, unit: U('modulo-regulador-ajustable-lm2596-dc-dc-step-down-3a-1-25-30v') },
      { name: 'Fusible 5 A + portafusible', qty: 4, price: 25 },
      { name: 'Capacitor 1000 µF 25 V', qty: 4, price: 8, unit: U('capacitor-electrolitico-50v') },
      { name: 'Cable 16 AWG rojo/negro (m)', qty: 20, price: 18 },
      { name: 'Conector JST SM 3 pines', qty: 8, price: 12 },
    ],
  },
  {
    id: 'sig-sens', title: 'Sensores inalámbricos', items: [
      { name: 'ESP32-C3 SuperMini (nodo del tapete)', qty: 1, price: 90, unit: U('esp32-c3-supermini-tipo-c-tarjeta-de-expansion') },
      { name: 'FSR 406 (sensor de fuerza 43 × 43 mm)', qty: 2, price: 180, unit: U('sensor-de-fuerza-resistivo-fsr-400-406-406') },
      { name: 'UNIT TouchDot S3 (nodo de la mesa)', qty: 1, price: 200, unit: U('unit-touchdot-s3') },
      { name: 'Cinta de cobre adhesiva 25 mm', qty: 1, price: 90 },
      { name: 'Alternativa: MPR121 (12 pads I2C)', qty: 1, price: 70, alt: true },
      { name: 'Opcional: VL53L0X ToF (uno por letra)', qty: 4, price: 47, unit: U('vl53l0x-medidor-de-distancia-laser-i2c-940nm-tof') },
      { name: 'Power bank 10 000 mAh', qty: 2, price: 350, outside: true },
    ],
  },
];

export const SIGNAGE_SERVICES = [
  { name: 'Corte láser · acrílico opal 3 mm', detail: '4 caras (hasta 880 × 1200 mm) + costados · cama ≥ 1300 × 900 mm · archivos SVG 1:1 en el repo', estimate: null, unitService: 'servicio de corte láser de UNIT' },
  { name: 'Corte láser · MDF 6 mm', detail: '4 fondos con el recorrido de la tira grabado', estimate: null, unitService: 'servicio de corte láser de UNIT' },
  { name: 'Impresión 3D · esquineros y clips en PETG', detail: '16 por letra, 64 en total', estimate: null, unitService: 'servicio de impresión 3D de UNIT' },
];

export const sum = (items: BomItem[]) => items.filter((i) => !i.alt && i.price !== null).reduce((a, i) => a + i.qty * (i.price ?? 0), 0);
export const groupTotal = (g: BomGroup) => sum(g.items);
/** Total de varias versiones contando una sola vez las piezas compartidas (`key`). */
export function unionTotal(groups: BomGroup[]): number {
  const seen = new Map<string, number>();
  let total = 0;
  for (const g of groups) for (const i of g.items) {
    if (i.alt || i.price === null) continue;
    const k = i.key ?? `${g.id}:${i.name}`;
    const prev = seen.get(k) ?? 0;
    if (i.qty > prev) { total += (i.qty - prev) * i.price; seen.set(k, i.qty); }
  }
  return total;
}
export const unitOnly = (items: BomItem[]) => items.filter((i) => !i.alt && !i.outside);
export const mxn = (n: number) => `MXN ${Math.round(n).toLocaleString('es-MX')}`;
