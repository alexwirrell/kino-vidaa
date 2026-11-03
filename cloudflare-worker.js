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
// Uso: https://TU-WORKER.workers.dev/?url=<destino codificado>
//      &ref=<Referer>   opcional: muchos servidores de video lo exigen
//      &hdr=<JSON>      opcional: cabeceras extra {"User-Agent": "...", "Cookie": "..."}
// =============================================================================

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

    let upstream;
    try {
      upstream = await fetch(dest.toString(), {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "follow",
      });
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
