# propuesta_unit · Aminoacid × UNIT Electronics

Presentación web de la alianza entre el estudio y [UNIT Electronics](https://uelectronics.com): tres proyectos
(Shadows & Lights con música sincronizada, Praxiboscopic y smart_signage), qué está hecho, qué sigue y qué piezas y
servicios de taller pedimos. En línea: **https://ericmargay.github.io/propuesta_unit/**

Es una página de una sola pantalla larga con cuatro modelos Three.js en vivo:

| Sección | Modelo | De dónde sale |
|---|---|---|
| Portada y Shadows & Lights | el cuadro de 60 × 60 con sus 28 placas, la tapa y los 120 LEDs; sombras reales de hasta cuatro cúmulos de luz; las secuencias son el motor del Arduino portado a TS (`src/three/engine.ts`) | `src/data/obra.json` (exportado de `shadows_and_lights/proyecto/obra.json`) y `src/sketches/*.ino` |
| Música en la obra | la mesa de trabajo de cada versión (0–4) con las piezas a tamaño real, sus conexiones y las fichas de UNIT | `src/data/versions.ts` |
| Praxiboscopic | las 16 piezas impresas (STL reales) sobre las tres hojas de corte láser (SVG reales 1:1) | `public/models/praxiboscopic/` (copiados de `praxiboscopic/public/fabricacion/tambores/`) |
| smart_signage | las cuatro letras a 1,20 m con su tira en serpentina, el tapete y la mesa; reaccionan al clic | `src/data/letras.json` (de `smart_signage/fabricacion/letras/`) |

Las listas de piezas y los totales se calculan desde `src/data/bom.ts`.

```bash
npm install
npm run dev        # http://localhost:5173/propuesta_unit/
npm run build      # tsc + vite → dist/
npm run captura    # capturas/*.png con Chrome headless y aviso de errores de consola
```

Se publica en GitHub Pages con `.github/workflows/pages.yml` en cada push a `main`.

## Actualizar los datos

- Cambió la obra: exportar de nuevo `src/data/obra.json` (panel, tapa, tira y placas) desde `proyecto/obra.json`.
- Cambiaron las letras: `npm run letras` en `smart_signage` y copiar `fabricacion/letras/letras.json`.
- Cambiaron las piezas impresas o las hojas de Praxiboscopic: `npm run fabricar` allá y copiar `impresion-3d/*.stl` y `laser/*.svg`.
- Precios: `src/data/bom.ts` (orientativos; se confirman en tienda).
