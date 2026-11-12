# CT LAB PRO v3.2 — CUATRO TRAZOS

PWA de procesamiento gráfico local. Reemplaza los archivos del repositorio por los de esta carpeta en la raíz de la rama `principal`.

## Incluye
- Preparación de impresión en Halftone Pro: ancho/alto en cm, proporción bloqueada, selección de DPI (150/200/300/360) y cálculo de píxeles/DPI efectivos. Límite de seguridad de 30 MP para proteger la memoria del navegador.
- Orden de acabado: redimensionado y remuestreo → eliminación de fondo → semitono → integración con prenda (knockout de tinta negra opcional) → limpieza final de semitransparencias.
- Integración con prenda negra: vuelve transparentes los píxeles de tinta suficientemente oscuros para que la tela negra complete esas zonas. Ajustable por tolerancia; revisar textos y detalles negros porque también pueden desaparecer.
- Limpieza de alpha opcional: elimina semitransparencias por debajo del umbral y vuelve opacos los píxeles restantes. Puede endurecer bordes finos; revisar antes de imprimir.
- Biblioteca local IndexedDB (misma base `ctlab-db`, almacén `assets`, para conservar diseños ya guardados en el mismo navegador/origen).
- Halftone Pro: semitono a color preservando tonos locales; eliminación de fondo por regiones conectadas a los bordes (flood fill) para conservar negros internos; cuentagotas, tolerancia y borde suave; semitono monocromático; ajustes de frecuencia, contraste y brillo; exportación PNG.
- Corrección v3.2: el modo “Quitar fondo” elimina únicamente píxeles similares al color elegido que estén conectados al borde de la imagen. Los valores cero de tolerancia y borde suave se respetan correctamente.
- Transparency Lab: eliminación de fondo por color/tolerancia e inversión de selección, exportación PNG con alpha.
- Image Enhancer: ajustes de nitidez, reducción de ruido, contraste, brillo y escalado por interpolación del navegador.
- Vector Lab: vectorización monocromática aproximada basada en rectángulos SVG; no sustituye un trazador Bézier profesional.
- DTF Studio: composición básica de hoja desde los recursos de la biblioteca.
- Mockup Studio: previsualización esquemática de prenda y ubicación de estampa.
- PWA con caché versionada y actualización del service worker.

## Instalación
Subir y reemplazar los seis archivos `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg` y `README.md` en la raíz del repositorio. Mantener la rama `principal` y la carpeta raíz en GitHub Pages. Confirmar el commit y esperar que `pages build and deployment` quede verde. En Chrome, abrir el sitio y realizar `Ctrl+Shift+R`.

## Límites técnicos importantes
- La eliminación por conectividad conserva zonas similares de color que estén encerradas dentro del diseño. Si el fondo entra en contacto con el sujeto por una abertura, puede alcanzar regiones internas; revisar siempre los bordes antes de exportar. Fondos con sombras o degradados pueden requerir ajustar tolerancia y suavizado.
- El semitono a color genera puntos con el color promedio de cada celda; no es una separación CMYK ni un RIP de impresión.
- Las imágenes se procesan localmente. La biblioteca está almacenada por navegador/dispositivo y no sincroniza entre equipos.
- Image Enhancer aplica filtros clásicos e interpolación; no incluye un modelo de IA de superresolución ni puede recuperar información que no exista en el original.
- Vector Lab produce un SVG rasterizado por bloques/rectángulos, útil como conversión simple, no como vectorización de curvas editable de calidad profesional.
- DTF Studio actual es un montador básico; no incorpora todavía nesting industrial, perfiles ICC ni RIP. La resolución efectiva debe comprobarse antes de producción.
- Mockup Studio es una simulación esquemática, no un mockup fotográfico realista.
- Probado con comprobación sintáctica del JavaScript; requiere validación funcional en el navegador y pruebas de impresión antes de uso productivo.


## v2.3 — Corrección de semitono a color
- El modo combinado elimina el fondo conectado a los bordes mediante selección por color.
- Conserva los canales RGB originales del personaje.
- No elimina automáticamente las zonas blancas del sujeto.
- Mantiene detalles oscuros internos al limitar la eliminación al fondo conectado con los bordes.


## CT LAB PRO v2.5
- Halftone Pro mantiene fija la mesa de trabajo en pantallas de escritorio; el panel de parámetros tiene su propio desplazamiento vertical.
- En pantallas pequeñas, el diseño vuelve a flujo vertical para conservar usabilidad.
- Se puede elegir un color sólido para el fondo de vista previa o volver al patrón cuadriculado.
- El color de vista previa se aplica únicamente al contenedor visual: no forma parte del canvas ni del PNG exportado.

## v2.6 — vista previa y ajuste automático
- El selector de fondo aplica el color directamente al área completa de previsualización mediante estilos prioritarios; el modo cuadriculado se puede restaurar con su botón.
- La mesa de trabajo calcula el tamaño visible según el espacio disponible y la proporción de la imagen. La imagen se muestra completa, sin recortes ni deformaciones.
- El ajuste afecta únicamente a la presentación en pantalla: las dimensiones y los píxeles del canvas exportado permanecen intactos.


## CT LAB PRO v2.7 — Zoom de vista previa
- Controles de acercar y alejar (25% a 500%) en Halftone Studio.
- Botón Ajustar para volver a encajar la imagen completa en la mesa.
- Al ampliar, la mesa permite desplazamiento horizontal y vertical mediante sus barras de desplazamiento.
- El zoom afecta únicamente la visualización; no cambia dimensiones, DPI ni píxeles exportados.


## CT LAB PRO v3.0 — Separation workflow

Esta actualización amplía el módulo de semitonos con controles de trama y herramientas de separación para preparación DTF:

- Frecuencia de trama expresada como LPI y sincronizada con el paso de celda en píxeles según el DPI elegido.
- Ángulo de trama y formas de punto circular, elíptico, cuadrado y línea.
- Exportación de base blanca independiente desde la transparencia del arte, con choke configurable.
- Exportación de máscara alfa independiente para inspección del área imprimible.
- Se conserva la eliminación de fondo por cuentagotas, modo combinado quitar fondo + semitono, conservación de color, limpieza de alfa, fusión de negros y zoom/vista de fondo.

### Límites importantes de esta versión

- El control LPI/ángulo/forma es una trama raster de previsualización y preparación; no equivale a un motor RIP calibrado. Confirmá frecuencia, ángulo y lineatura con el proveedor de impresión.
- La base blanca se genera como máscara derivada del alfa del resultado; no incluye perfiles ICC, choke por canal avanzado ni compensación automática según tinta/prensa.
- Image Enhancer usa interpolación y filtros locales; no es un modelo de super-resolución por IA ni recupera detalle que no exista en el original.
- No se incluye todavía separación CMYK spot-channel, edición por pincel/máscara, trapping avanzado ni AI upscaler.
- El procesamiento es local en el navegador. Las funciones de IA online quedan previstas para una integración futura opcional; esta versión no requiere suscripciones ni envía imágenes a servidores.

**Recomendación de producción:** trabajar sobre una copia, inspeccionar al 100–200% con distintos fondos de previsualización y realizar una prueba física antes de producir una tirada.


## CT LAB PRO v3.1 — CT AI Assistant
- Nueva sección CT AI Assistant para preparar un brief técnico de asistencia externa.
- Exporta el informe JSON y la imagen original en dos archivos separados para adjuntarlos manualmente a ChatGPT.
- Incluye objetivo, tipo de prenda, DPI y medida final, instrucciones y lista de control de retorno.
- No conecta con APIs ni sube imágenes automáticamente; el usuario controla qué comparte.
- Esta función organiza el flujo de trabajo, no realiza por sí sola restauración IA, segmentación IA ni validación automática de calidad.
