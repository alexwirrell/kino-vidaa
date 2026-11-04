# Pruebas

Abren `index.html` en Chromium (Playwright), simulan el control remoto (flechas, OK, Back,
teclas de colores…) y responden a la red con datos falsos: no hace falta internet ni un TV.

```bash
cd tests
npm ci
npx playwright install chromium   # solo la primera vez
bash make-fixtures.sh             # genera los videos de prueba (necesita ffmpeg)
node run.js                       # todas
node run.js continuar teclado     # solo las que contienen esas palabras
```

Cada archivo de `cases/` imprime lo que pasó; `run.js` comprueba que aparezca lo esperado y
que la página no tenga errores. GitHub las ejecuta en cada cambio (`.github/workflows/tests.yml`).
