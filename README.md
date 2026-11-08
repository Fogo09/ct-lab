# CT LAB PRO v2.1 — CUATRO TRAZOS

PWA de procesamiento gráfico local. Reemplaza los archivos del repositorio por los de esta carpeta en la raíz de la rama `principal`.

## Incluye
- Biblioteca local IndexedDB (misma base `ctlab-db`, almacén `assets`, para conservar diseños ya guardados en el mismo navegador/origen).
- Halftone Pro v2.1: semitono a color preservando tonos locales; eliminación de fondo con cuentagotas sobre la imagen original, tolerancia y borde suave; semitono monocromático con tinta blanca o negra; ajustes de frecuencia, contraste y brillo; exportación PNG.
- Transparency Lab: eliminación de fondo por color/tolerancia e inversión de selección, exportación PNG con alpha.
- Image Enhancer: ajustes de nitidez, reducción de ruido, contraste, brillo y escalado por interpolación del navegador.
- Vector Lab: vectorización monocromática aproximada basada en rectángulos SVG; no sustituye un trazador Bézier profesional.
- DTF Studio: composición básica de hoja desde los recursos de la biblioteca.
- Mockup Studio: previsualización esquemática de prenda y ubicación de estampa.
- PWA con caché versionada y actualización del service worker.

## Instalación
Subir y reemplazar los seis archivos `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg` y `README.md` en la raíz del repositorio. Mantener la rama `principal` y la carpeta raíz en GitHub Pages. Confirmar el commit y esperar que `pages build and deployment` quede verde. En Chrome, abrir el sitio y realizar `Ctrl+Shift+R`.

## Límites técnicos importantes
- El cuentagotas elimina un color por similitud RGB; fondos con sombras, degradados o el mismo color dentro del personaje pueden requerir ajustar tolerancia y suavizado. Revisar siempre los bordes antes de exportar.
- El semitono a color genera puntos con el color promedio de cada celda; no es una separación CMYK ni un RIP de impresión.
- Las imágenes se procesan localmente. La biblioteca está almacenada por navegador/dispositivo y no sincroniza entre equipos.
- Image Enhancer aplica filtros clásicos e interpolación; no incluye un modelo de IA de superresolución ni puede recuperar información que no exista en el original.
- Vector Lab produce un SVG rasterizado por bloques/rectángulos, útil como conversión simple, no como vectorización de curvas editable de calidad profesional.
- DTF Studio actual es un montador básico; no incorpora todavía nesting industrial, perfiles ICC ni RIP. La resolución efectiva debe comprobarse antes de producción.
- Mockup Studio es una simulación esquemática, no un mockup fotográfico realista.
- Probado con comprobación sintáctica del JavaScript; requiere validación funcional en el navegador y pruebas de impresión antes de uso productivo.
