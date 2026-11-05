<p align="center">
  <img src="icon.svg" width="128" height="128" alt="Ícono de Kino TV — VIDAA OS Edition">
</p>

<h1 align="center">Kino TV — VIDAA OS Edition</h1>

<p align="center">
  Los plugins de Kino en el navegador de los televisores Hisense con <b>VIDAA OS</b>,<br>
  pensados para manejarse de principio a fin con el <b>control remoto</b>.
</p>

<p align="center">
  <a href="https://github.com/alexwirrell/kino-vidaa/actions/workflows/tests.yml"><img src="https://github.com/alexwirrell/kino-vidaa/actions/workflows/tests.yml/badge.svg" alt="Pruebas"></a>
</p>

---

Es una sola página web (`index.html`) que se abre en el navegador del TV. Carga los mismos
plugins que la app Kino (API de `kino.d.ts`) y los addons de Stremio, y reproduce los videos
en un reproductor propio que se controla con el mando: pausa, avance, subtítulos, audio,
servidor siguiente…

## Cómo usarla en el TV

1. En el TV abre el **navegador** de VIDAA.
2. Entra en **https://alexwirrell.github.io/kino-vidaa/** y guárdala en favoritos.
3. Ve a **🧩 Tienda Plugins** e instala los que quieras.
4. Recomendado: configura en **⚙️ Ajustes / Red** tu [proxy propio](#proxy-propio-cloudflare-worker)
   y una [llave de TMDB](#llave-de-tmdb).

En **🩺 Diagnóstico** está el registro de todo lo que hace la app (red, plugins, reproductor).
Es lo primero que conviene mirar —o compartir— cuando algo no funciona.

## Qué hace

| | |
|---|---|
| **Plugins de Kino y addons de Stremio** | Tienda con el catálogo de Kino y de la comunidad, instalación por GitHub o URL, `kino.fetch`, `kino.crypto` (AES, 3DES, HMAC…), `kino.secret`, `kino.browser`, `kino.meta` y `kino.tmdb`. |
| **Reproductor propio** | HLS (hls.js), MP4 y **DASH con DRM** Widevine/PlayReady (Shaka Player). Barra de progreso, ⏮ ⏭ entre servidores y paso automático a otra copia si una falla, es relleno o da 429. |
| **Videos de páginas embed** | Saca el `.m3u8`/`.mp4` de servidores como StreamWish, Vidhide o VOE (desempaca `eval(function(p,a,c,k,e,d)…)` y base64) para verlos en el reproductor propio. Si no se puede, ofrece el modo 🖱 **Puntero**. |
| **Continuar viendo** | Guarda por dónde vas, reanuda donde lo dejaste y pasa solo al siguiente episodio (cuenta atrás de 10 s). |
| **Aprende qué funciona** | Recuerda qué plugins y servidores arrancan de verdad y prueba primero esos; reutiliza 20 min el último enlace que funcionó. |
| **Subtítulos** | Los del video, los de tus plugins, addons de Stremio y OpenSubtitles; detecta la codificación y convierte SRT. |
| **Audio y calidad** | Elegir pista (Latino, Castellano, Original…) y calidad; el idioma se recuerda. |
| **En vivo** | Canales de los plugins y listas M3U propias, también `http://` y puertos raros a través del proxy propio. |
| **Teclado en pantalla** | Cuadrícula de letras para el control, con sugerencias de TMDB en el buscador. |
| **Episodios por temporada** | Selector de temporadas y, al elegir un episodio, el foco pasa al menú de servidores. |
| **Salud de los plugins** | 🩺 en cada plugin (funciona / lento / no aporta, con el motivo) y botón para ponerlos en pausa. |
| **Copia de seguridad** | Tus plugins, proxy, llave y preferencias en un código con QR, para restaurarlos si el TV borra los datos. |

## Control remoto

| Tecla | En el reproductor | En el resto de la app |
|---|---|---|
| Flechas / OK | Mover el foco · pausa / reproducir | Navegar · abrir |
| ◀ ▶ (barra oculta) | Retroceder / avanzar 10 s | — |
| ▼ | Ocultar la barra | — |
| Back | Cerrar panel / puntero / reproductor | Volver |
| Play, Pausa, ⏩, ⏪, Stop | Lo que dicen | — |
| Subtítulos | Panel de subtítulos | — |
| 🔴 Rojo | Subtítulos | Buscar (con el teclado abierto) |
| 🟢 Verde | Audio y calidad | Continuar lo último que viste |
| 🟡 Amarillo | Pasar al reproductor nativo del TV | Inicio |
| 🔵 Azul | Servidor siguiente | Diagnóstico |

## Proxy propio (Cloudflare Worker)

El navegador del TV no deja leer muchas páginas por CORS, ni enviar `Referer`, `User-Agent` o
`Cookie`, que muchos servidores de video exigen. Los proxies públicos suelen estar caídos.
La solución es un proxy tuyo y gratis en Cloudflare:

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) y crea una cuenta gratis.
2. **Workers & Pages** → **Create** → **Create Worker** → **Deploy**.
3. **Edit code**: borra todo, pega el contenido de [`cloudflare-worker.js`](cloudflare-worker.js) y pulsa **Deploy**.
   (El mismo código también está en 🩺 Diagnóstico.)
4. En la app: **⚙️ Ajustes / Red** → **Proxy propio** → escribe la dirección del worker → **💾 Guardar**.

El plan gratis permite 100 000 peticiones al día. Si se pasan, Cloudflare rechaza las demás
hasta el día siguiente: no cobra nada salvo que actives a mano un plan de pago.

> **Privacidad:** la dirección de tu worker no va en el código ni en este repositorio (una
> prueba automática lo comprueba). Se guarda solo en el TV. Si quieres que nadie más pueda
> usarlo, pon una clave en `ACCESS_KEY` **solo en el editor de Cloudflare** y escribe la
> dirección en la app como `tu-worker.workers.dev/?key=TU-CLAVE`.

## Llave de TMDB

Varios plugins (Embed 69, YojaTV…) y la búsqueda de subtítulos usan TMDB. La llave es gratis
para uso personal: crea una cuenta en [themoviedb.org](https://www.themoviedb.org) →
**Configuración** → **API** → solicita una llave *Developer* y copia la **Clave de la API (v3)**
(32 caracteres, no el token largo). Escríbela en **⚙️ Ajustes / Red**. Solo viaja directo a
TMDB o por tu worker, nunca por proxies públicos, y no aparece en el Diagnóstico.

## Límites conocidos

- **Captchas y verificaciones de Cloudflare** de algunos sitios: la app no los salta.
- **Enlaces atados a una dirección IP** (p. ej. streamtape): funcionan solo para quien los pidió.
- **DRM con restricción de país o de app** (p. ej. Caracol TV): el TV admite Widevine, pero el
  servidor exige la app oficial desde Colombia.
- Cuando un sitio cambia su diseño, su plugin puede dejar de encontrar contenido hasta que su
  autor lo actualice: el panel 🩺 lo indica.

## Desarrollo

```
index.html              la app completa (HTML, CSS y JavaScript)
cloudflare-worker.js    el proxy propio para Cloudflare Workers
icon.svg, icons/        ícono (favicon, celular, manifiesto)
manifest.webmanifest    nombre e íconos para «añadir a la pantalla de inicio»
tests/                  pruebas automáticas (Playwright)
```

No hay paso de compilación: se edita `index.html` y se publica con GitHub Pages desde `main`.

### Pruebas

Abren la app en Chromium, simulan el control remoto y responden a la red con datos falsos
(sin internet ni TV). GitHub las ejecuta en cada cambio.

```bash
cd tests
npm ci
npx playwright install chromium   # solo la primera vez
bash make-fixtures.sh             # genera los videos de prueba (necesita ffmpeg)
node run.js                       # todas, o p. ej.: node run.js teclado continuar
```

## Créditos

- Plugins: sus autores (en la Tienda se ve cada uno). API de plugins de [Kino](https://github.com/kinotvapp).
- [hls.js](https://github.com/video-dev/hls.js), [Shaka Player](https://github.com/shaka-project/shaka-player)
  y [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator).
- Catálogo y metadatos: [TMDB](https://www.themoviedb.org) y [Cinemeta](https://v3-cinemeta.strem.io).
  Este proyecto usa la API de TMDB pero no está avalado ni certificado por TMDB.
- Subtítulos: [OpenSubtitles](https://www.opensubtitles.org) (vía addon de Stremio).

Este proyecto no aloja ningún video: solo ejecuta los plugins que instalas, que buscan en sitios
de terceros. Usa cada plugin según las leyes de tu país.
