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

import { connect } from "cloudflare:sockets";

const ACCESS_KEY = ""; // ← pon aquí tu clave (p. ej. "mi-clave-larga-123"); vacío = sin clave

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Cabeceras del navegador del TV que no se reenvían al destino
const DROP = ["host", "origin", "referer", "cookie", "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor",
  "x-forwarded-for", "x-forwarded-proto", "x-real-ip", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"];

// ---------------------------------------------------------------------------
// Canales en vivo en http://IP:PUERTO (p. ej. TV Latam: http://190.108.83.69:8000).
// El fetch() de Cloudflare solo conecta a algunos puertos (y no a toda IP), así
// que para esos se habla HTTP "a mano" por una conexión TCP (cloudflare:sockets),
// enviando el video por streaming (sin acumularlo: poco CPU en el plan gratis).
// ---------------------------------------------------------------------------
const FETCH_PORTS = { "http:": ["", "80", "8080", "8880", "2052", "2082", "2086", "2095"],
                      "https:": ["", "443", "2053", "2083", "2087", "2096", "8443"] };
const isIpHost = h => /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":") || h.startsWith("[");
const needsSocket = u => !FETCH_PORTS[u.protocol].includes(u.port) || isIpHost(u.hostname);

function joinBytes(a, b) {
  if (!a.length) return b;
  const out = new Uint8Array(a.length + b.length);
  out.set(a); out.set(b, a.length);
  return out;
}
function indexOfSeq(buf, seq) {
  outer: for (let i = 0; i + seq.length <= buf.length; i++) {
    for (let j = 0; j < seq.length; j++) if (buf[i + j] !== seq[j]) continue outer;
    return i;
  }
  return -1;
}
const CRLF = [13, 10], CRLF2 = [13, 10, 13, 10];

async function socketFetch(u, method, headers, body, manual, hops = 0) {
  const secure = u.protocol === "https:";
  const sock = connect({ hostname: u.hostname.replace(/^\[|\]$/g, ""), port: Number(u.port || (secure ? 443 : 80)) },
    secure ? { secureTransport: "on", allowHalfOpen: false } : { allowHalfOpen: false });
  const w = sock.writable.getWriter();
  let head = `${method} ${u.pathname || "/"}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nConnection: close\r\nAccept-Encoding: identity\r\n`;
  for (const [k, v] of headers) if (!/^(host|connection|accept-encoding|content-length|transfer-encoding)$/i.test(k)) head += `${k}: ${v}\r\n`;
  if (body) head += `Content-Length: ${body.byteLength}\r\n`;
  await w.write(new TextEncoder().encode(head + "\r\n"));
  if (body) await w.write(new Uint8Array(body));
  w.releaseLock();

  const reader = sock.readable.getReader();
  let pending = new Uint8Array(0);
  const readMore = async () => { const { value, done } = await reader.read(); if (done) return false; pending = joinBytes(pending, value); return true; };
  let end = -1;
  while ((end = indexOfSeq(pending, CRLF2)) < 0) {
    if (pending.length > 65536) throw new Error("cabeceras demasiado grandes");
    if (!(await readMore())) throw new Error("el servidor cerró la conexión sin responder");
  }
  const lines = new TextDecoder().decode(pending.subarray(0, end)).split("\r\n");
  pending = pending.subarray(end + 4);
  const m = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/.exec(lines[0]);
  if (!m) throw new Error("respuesta que no es HTTP");
  const status = Number(m[1]);
  const rh = new Headers();
  for (const l of lines.slice(1)) { const i = l.indexOf(":"); if (i > 0) rh.append(l.slice(0, i).trim(), l.slice(i + 1).trim()); }

  if (!manual && [301, 302, 303, 307, 308].includes(status) && rh.get("location") && hops < 5) {
    reader.cancel().catch(() => {});
    const next = new URL(rh.get("location"), u);
    const m2 = status === 303 ? "GET" : method, b2 = m2 === "GET" || m2 === "HEAD" ? undefined : body;
    if (needsSocket(next)) return socketFetch(next, m2, headers, b2, manual, hops + 1);
    const r = await fetch(next.toString(), { method: m2, headers, body: b2 });
    return { status: r.status, statusText: r.statusText, headers: r.headers, body: r.body, url: r.url };
  }

  const chunked = /chunked/i.test(rh.get("transfer-encoding") || "");
  let remaining = method === "HEAD" || status === 204 || status === 304 ? 0 : (rh.has("content-length") ? Number(rh.get("content-length")) : -1);
  ["transfer-encoding", "connection", "keep-alive"].forEach(h => rh.delete(h));
  let chunkLeft = 0, needCRLF = false;
  const stop = ctrl => { ctrl.close(); reader.cancel().catch(() => {}); };
  const stream = new ReadableStream({
    async pull(ctrl) {
      for (;;) {
        if (!chunked) {
          if (pending.length) {
            const out = remaining >= 0 ? pending.subarray(0, remaining) : pending;
            pending = new Uint8Array(0);
            if (remaining >= 0) remaining -= out.length;
            if (out.length) ctrl.enqueue(out);
            if (remaining === 0) stop(ctrl);
            return;
          }
          if (remaining === 0) { stop(ctrl); return; }
          if (!(await readMore())) { ctrl.close(); return; }
          continue;
        }
        // Transfer-Encoding: chunked
        if (chunkLeft > 0) {
          if (!pending.length && !(await readMore())) { ctrl.close(); return; }
          const out = pending.subarray(0, chunkLeft);
          pending = pending.subarray(out.length);
          chunkLeft -= out.length;
          if (!chunkLeft) needCRLF = true;
          ctrl.enqueue(out);
          return;
        }
        if (needCRLF) {
          if (pending.length < 2) { if (!(await readMore())) { ctrl.close(); return; } continue; }
          pending = pending.subarray(2); needCRLF = false; continue;
        }
        const i = indexOfSeq(pending, CRLF);
        if (i < 0) { if (!(await readMore())) { ctrl.close(); return; } continue; }
        const size = parseInt(new TextDecoder().decode(pending.subarray(0, i)).split(";")[0].trim(), 16);
        pending = pending.subarray(i + 2);
        if (!size) { stop(ctrl); return; }
        chunkLeft = size;
      }
    },
    cancel() { reader.cancel().catch(() => {}); }
  });
  return { status, statusText: m[2] || "", headers: rh, body: stream, url: u.toString() };
}

function cors(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");
  headers.set("Access-Control-Expose-Headers", "*");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export default {
  // Cualquier error interno vuelve con CORS y su motivo (si no, el TV solo ve
  // "sin respuesta" y no se sabe qué pasó)
  async fetch(request) {
    try { return await handle(request); }
    catch (err) {
      return new Response("error interno del worker: " + (err && err.stack ? String(err.stack).slice(0, 400) : err), { status: 500, headers: cors(new Headers({ "content-type": "text/plain; charset=utf-8" })) });
    }
  },
};

async function handle(request) {
  {
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
      upstream = needsSocket(dest)
        ? await socketFetch(dest, request.method, headers, body, redirect === "manual")
        : await fetch(dest.toString(), { method: request.method, headers, body, redirect });
    } catch (err) {
      return new Response("el destino no respondió: " + err, { status: 502, headers: cors(new Headers()) });
    }

    const out = new Headers(upstream.headers);
    ["content-security-policy", "content-security-policy-report-only", "x-frame-options",
     "cross-origin-resource-policy", "cross-origin-embedder-policy", "cross-origin-opener-policy",
     "set-cookie"].forEach(h => out.delete(h));
    out.set("X-Final-Url", upstream.url);
    // Estados que Response no admite (p. ej. 1xx o > 599) se normalizan
    const st = upstream.status >= 200 && upstream.status <= 599 ? upstream.status : 502;
    return new Response(upstream.body, { status: st, statusText: st === upstream.status ? upstream.statusText : "", headers: cors(out) });
  }
}
