// =============================================================================
// Proxy propio de Kino VIDAA para Cloudflare Workers (gratis)
//
// Por qué: los proxies públicos (codetabs, allorigins, cors.lol) suelen estar
// caídos o bloqueados, y sin proxy los plugins no pueden buscar ni la app puede
// sacar el video de los servidores web. Este worker es TU proxy: rápido,
// gratis (100.000 peticiones al día) y con soporte de video.
//
// Cómo instalarlo (5 minutos, desde el teléfono o el computador):
//   1. Entra en https://dash.cloudflare.com (crea una cuenta gratis).
//   2. Menú "Workers & Pages" → "Create" → "Create Worker" → "Deploy".
//   3. "Edit code": borra todo, pega ESTE archivo completo y pulsa "Deploy".
//   4. Copia la dirección del worker (algo como https://kino.TU-NOMBRE.workers.dev).
//   5. En la app: ⚙️ Ajustes / Red → Proxy propio → pega la dirección → Guardar.
//      (La app añade sola el "/?url=" del final.)
//
// Clave privada (recomendado): escribe una clave en ACCESS_KEY, aquí abajo,
// SOLO en el editor de Cloudflare (no la subas a ningún repositorio). Así nadie
// más puede usar tu worker aunque conozca la dirección. En la app escribe la
// dirección con la clave: kino.TU-NOMBRE.workers.dev/?key=TU-CLAVE
//
// ¿Cuesta dinero? No en el plan gratis: si se pasan las 100.000 peticiones del
// día, Cloudflare simplemente rechaza las siguientes hasta el día siguiente; no
// cobra nada salvo que tú actives a mano un plan de pago.
//
// Uso: https://TU-WORKER.workers.dev/?url=<destino codificado>
//      &ref=<Referer>   opcional: muchos servidores de video lo exigen
//      &hdr=<JSON>      opcional: cabeceras extra {"User-Agent": "...", "Cookie": "..."}
// =============================================================================

const ACCESS_KEY = ""; // ← pon aquí tu clave (p. ej. "mi-clave-larga-123"); vacío = sin clave

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Cabeceras del navegador del TV que no se reenvían al destino
const DROP = ["host", "origin", "referer", "cookie", "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor",
  "x-forwarded-for", "x-forwarded-proto", "x-real-ip", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"];

function cors(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");
  headers.set("Access-Control-Expose-Headers", "*");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(new Headers()) });

    const self = new URL(request.url);
    if (ACCESS_KEY && self.searchParams.get("key") !== ACCESS_KEY) {
      return new Response("clave incorrecta", { status: 403, headers: cors(new Headers()) });
    }
    const target = self.searchParams.get("url");
    if (!target) {
      return new Response("Proxy de Kino VIDAA funcionando ✓  (uso: /?url=https://...)", {
        status: 200, headers: cors(new Headers({ "content-type": "text/plain; charset=utf-8" })) });
    }
    let dest;
    try { dest = new URL(target); } catch (_) { return new Response("url inválida", { status: 400, headers: cors(new Headers()) }); }
    if (!/^https?:$/.test(dest.protocol)) return new Response("solo http/https", { status: 400, headers: cors(new Headers()) });

    const headers = new Headers();
    for (const [k, v] of request.headers) if (!DROP.includes(k.toLowerCase())) headers.set(k, v);
    headers.set("User-Agent", BROWSER_UA);
    const ref = self.searchParams.get("ref");
    if (ref) {
      headers.set("Referer", ref);
      try { headers.set("Origin", new URL(ref).origin); } catch (_) {}
    }
    const extra = self.searchParams.get("hdr");
    if (extra) {
      try { for (const [k, v] of Object.entries(JSON.parse(extra))) headers.set(k, String(v)); } catch (_) {}
    }

    // El cuerpo se lee entero: si el destino redirige (p. ej. rd.php), se puede
    // volver a enviar. Con el flujo original, la redirección fallaba (HTTP 502).
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const body = hasBody ? await request.arrayBuffer() : undefined;
    headers.delete("content-length");

    let upstream;
    try {
      // &redir=manual: devolver el 3xx con su Location (kino.fetch redirect "manual")
      const redirect = self.searchParams.get("redir") === "manual" ? "manual" : "follow";
      upstream = await fetch(dest.toString(), { method: request.method, headers, body, redirect });
    } catch (err) {
      return new Response("el destino no respondió: " + err, { status: 502, headers: cors(new Headers()) });
    }

    const out = new Headers(upstream.headers);
    ["content-security-policy", "content-security-policy-report-only", "x-frame-options",
     "cross-origin-resource-policy", "cross-origin-embedder-policy", "cross-origin-opener-policy",
     "set-cookie"].forEach(h => out.delete(h));
    out.set("X-Final-Url", upstream.url);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: cors(out) });
  },
};
