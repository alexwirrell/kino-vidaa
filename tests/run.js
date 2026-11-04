#!/usr/bin/env node
// Ejecuta todas las pruebas y comprueba lo que cada una debe mostrar.
// Cada prueba abre index.html en Chromium (Playwright), simula el control remoto y
// responde a la red con datos falsos (sin internet). Uso: node run.js [nombre…]
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Lo que debe aparecer en la salida de cada prueba (además de «errors []» sin errores)
const SUITE = [
  { file: "seguridad-y-proxy", expect: [/sin direcciones de worker en el código: true/, /POST por el proxy con clave → 200/] },
  { file: "reproductor-basico", expect: [/OK → reproduce: true/, /E\) Enlace roto/] },
  { file: "canales-en-vivo", expect: [/L0 .*✓ REPRODUCE/, /L2 .*✓ REPRODUCE/, /L3 En Vivo → OK en el canal: ✓ REPRODUCE/] },
  { file: "proxy-propio-referer", expect: [/video que exige Referer → ✓ REPRODUCE/] },
  { file: "embed69-extraer", expect: [/Resolver y Reproducir → ✓ REPRODUCE/] },
  { file: "interfaz-botones", expect: [/errores totales: 0/] },
  { file: "alternativas-429-barra", expect: [/429 → alternativas → ✓ REPRODUCE/, /truncated: true/] },
  { file: "plugin-lento", expect: [/2\) Reproducir → video en [0-3]\.\d s/] },
  { file: "reintento-403", expect: [/403 directo → reintento por el worker → 200/] },
  { file: "listas-por-worker", expect: [/1\) .*200 «#EXTM3U.*worker/] },
  { file: "rescate-lista-larga", expect: [/reproduce: true/, /🛟 el plugin no dio enlace/] },
  { file: "episodios-por-temporada", expect: [/\*Temporada 1/, /6\) OK otra vez → reproduce: true/] },
  { file: "cinemeta-temporadas", expect: [/T2 E5 → temporada\/episodio: 2x5/, /Especiales E1 → 0x1/] },
  { file: "llave-tmdb-privada", expect: [/2\) token v4 → ⚠️/, /4\) TMDB directo OK → 1/, /llave visible en el registro\? false/], forbid: [/PÚBLICO api/] },
  { file: "saltar-relleno", expect: [/✓ REPRODUCE la buena/] },
  { file: "orden-inicio-diagnostico", expect: [/orden del Inicio: Caracol/, /última página que leyó: «Just a moment/] },
  { file: "dash-drm", args: ["direct"], expect: [/\[direct\] reproduce: true/] },
  { file: "dash-drm", args: ["proxy"], expect: [/\[proxy\] reproduce: true/, /worker:seg-0-1\.m4s\(UA✓\)/] },
  { file: "dash-drm", args: ["drm"], expect: [/Este video DASH con DRM no se pudo reproducir/] },
  { file: "filtro-por-anio", expect: [/año 2026 → enlaces: buena\.webm/, /año — → enlaces: buena\.webm/] },
  { file: "teclas-voe-sandbox", expect: [/tecla 463 → pausado: true · otra vez → pausado: false/, /VOE base64 → \["https:\/\/cdn-voe/, /voe\.sx → sandbox: allow-scripts/, /filemoon\.sx → sandbox: null/] },
  { file: "continuar-viendo", expect: [/3\) reanuda serie en: 100 s/, /OK → Mi Serie T1:E3/, /5\) peli reanuda en 60 s → Desde el inicio → 0 s/] },
  { file: "teclado-en-pantalla", expect: [/1\) OK en el campo → teclado abierto: true/, /3\) sugerencias: Obsesión \(2026\)/, /6\) Back → cerrado: true/, /7\) ⌨ TV → campo editable: true/] },
  { file: "historial-y-enlace-guardado", expect: [/2\) .*pidió: bueno$/m, /3\) .*⚡ Bueno/, /4\) enlace guardado caducado: [\d.]+ s · Uno \(Bueno/] },
  { file: "salud-plugins", expect: [/❌ No aportan: Gnula/, /Inicio llama a: g$/m, /3\) ▶ Activar Gnula → activo: true/] },
  { file: "audio-y-calidad", expect: [/hls audio: Castellano · nivel: 90/, /4\) otro video → audio recordado: Castellano/] },
  { file: "botones-de-colores", expect: [/🔴 fuera → vista: search · teclado abierto: true/, /🟢 en el reproductor → panel: 🎚/] },
  { file: "copia-de-seguridad", expect: [/QR dibujado: true/, /3\) restaurado: plugins \["yoja-tv-kino","gnula\(pausa\)","mio"\]/, /4\) código malo → ✗ Copia no válida/] },
];
// Errores de las páginas FALSAS de algunas pruebas (no de la app): se ignoran
const TEST_ARTIFACTS = [/jwplayer is not defined/, /Failed to read the 'localStorage' property/];

function run(t) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [path.join(__dirname, "cases", t.file + ".js"), ...(t.args || [])],
      { cwd: path.join(__dirname, "fixtures"), env: process.env });
    let out = "";
    child.stdout.on("data", d => { out += d; });
    child.stderr.on("data", d => { out += d; });
    const timer = setTimeout(() => { child.kill("SIGKILL"); out += "\n[tiempo agotado: 240 s]"; }, 240000);
    child.on("close", code => {
      clearTimeout(timer);
      const problems = [];
      if (code !== 0) problems.push(`terminó con código ${code}`);
      (t.expect || []).forEach(re => { if (!re.test(out)) problems.push(`falta: ${re}`); });
      (t.forbid || []).forEach(re => { if (re.test(out)) problems.push(`no debía aparecer: ${re}`); });
      // Cada bloque «errors [...]» debe estar vacío (salvo errores de las páginas falsas)
      const errBlocks = out.match(/(?:errors|errores totales: \d+) \[[\s\S]*?\]/g) || [];
      if (!errBlocks.length) problems.push("no imprimió «errors []»");
      errBlocks.forEach(b => {
        const msgs = (b.match(/'[^']*'|"[^"]*"/g) || []).filter(m => !TEST_ARTIFACTS.some(re => re.test(m)));
        if (msgs.length) problems.push(`errores de la página: ${msgs.join(", ").slice(0, 200)}`);
      });
      resolve({ name: t.file + (t.args ? ` (${t.args.join(" ")})` : ""), ok: !problems.length, problems, out, secs: (Date.now() - t0) / 1000 });
    });
  });
}

(async () => {
  if (!fs.existsSync(path.join(__dirname, "fixtures", "clip.webm"))) {
    console.error("Faltan los videos de prueba: ejecuta primero «bash make-fixtures.sh»");
    process.exit(2);
  }
  const only = process.argv.slice(2);
  const list = only.length ? SUITE.filter(t => only.some(o => t.file.includes(o))) : SUITE;
  const results = [];
  for (const t of list) {
    const r = await run(t);
    results.push(r);
    console.log(`${r.ok ? "✓" : "✗"} ${r.name} (${r.secs.toFixed(0)} s)`);
    if (!r.ok) {
      r.problems.forEach(p => console.log(`    · ${p}`));
      console.log(r.out.split("\n").filter(l => !/agent-proxy/.test(l)).slice(-25).map(l => "      | " + l).join("\n"));
    }
  }
  const bad = results.filter(r => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} pruebas correctas`);
  process.exit(bad.length ? 1 : 0);
})();
