// Rutas que comparten las pruebas: la app y las librerías que la app descarga de la CDN
// (en las pruebas se sirven desde node_modules, sin internet).
const path = require("path");
const APP_PATH = path.resolve(__dirname, "..", "index.html");
module.exports = {
  APP_PATH,
  APP: "file://" + APP_PATH,
  HLS_JS: require.resolve("hls.js/dist/hls.min.js"),
  SHAKA_JS: require.resolve("shaka-player/dist/shaka-player.compiled.js"),
  QR_JS: require.resolve("qrcode-generator/qrcode.js"),
};
