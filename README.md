# CT LAB — CUATRO TRAZOS

Primera versión funcional de CT LAB como PWA instalable y preparada para uso offline.

## Funciones incluidas
- Biblioteca local de imágenes con IndexedDB.
- Importación de PNG, JPG, WEBP y SVG.
- Halftone por puntos con tamaño configurable.
- Escala de grises, umbral, posterización, brillo y contraste.
- Exportación PNG.
- Armado de hoja DTF con diseños seleccionados.
- Backup JSON de la biblioteca.
- Diseño adaptable a móvil y escritorio.
- Service Worker y manifiesto PWA.

## Ejecutar localmente
Se necesita servir la carpeta por HTTP (no abrir index.html directamente), por ejemplo:

```bash
python -m http.server 8080
```

Luego abrir http://localhost:8080

## Publicar online sin suscripción
Subir el contenido de esta carpeta a un hosting estático gratuito compatible con HTTPS. Para instalar la PWA y habilitar Service Worker se requiere HTTPS, salvo localhost.

Opciones habituales: GitHub Pages, Cloudflare Pages o Netlify en sus planes gratuitos. Consultar sus condiciones vigentes antes de publicar.

## Importante
- El modo offline funciona después de la primera carga online.
- La biblioteca se guarda por navegador/dispositivo; no se sincroniza automáticamente.
- No hay funciones de IA generativa integradas: CT AI Design queda como futura ampliación local o con proveedor opcional.
- El armado DTF de esta versión coloca diseños en flujo simple; no realiza nesting industrial optimizado ni genera perfiles ICC.
- La exportación de hoja usa 118,11 px/cm (300 DPI nominales). Verificar dimensiones, perfil de color y requisitos del RIP/proveedor antes de imprimir.
- La aplicación no requiere cuenta, API key ni pago para las funciones incluidas.
