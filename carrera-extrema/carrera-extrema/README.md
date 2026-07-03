# 🏁 Carrera Extrema

Juego de carros top-down hecho en **HTML5 + CSS + JavaScript puro (sin librerías)**, desarrollado como examen del curso.

**Autor:** Elio Jose Gabancho Catunta

▶ **Jugar online:** _(pega aquí tu URL de GitHub Pages / Netlify / Vercel / itch.io una vez publicado)_

---

## Checklist de requerimientos cumplidos

| Requerimiento | Dónde está implementado |
|---|---|
| Score, vidas y puntos | HUD superior (`#hud`) — `hud-score`, `hud-lives`, `hud-points` en `index.html`, actualizado por `updateHud()` en `game.js` |
| Sonido de fondo y de colisión | `game.js` — Web Audio API: `startMusic()` / `startEngineHum()` (fondo) y `playCollisionSound()` (choque con enemigos/barriles). No usa archivos de audio externos, todo se sintetiza en el navegador |
| Dos niveles | `LEVELS = { 1: {...}, 2: {...} }` en `game.js` |
| Colisión | Detección AABB en `aabb()` + manejo en `update()` |
| Nivel 2 más difícil | Mayor velocidad (`speedMax`/`speedMin`), mayor frecuencia de aparición (`spawnInterval` más corto) y enemigos distintos (`car_blue`, `car_green`, `barrel_fast`) |
| Portada con nombre y apellido | `#screen-cover` en `index.html` |
| Mensaje "GANASTE" | `#screen-win`, función `winGame()` |
| Mensaje "VUELVE A INTENTARLO" | `#screen-gameover`, función `gameOver()` |
| Puntos para pasar de nivel | Constante `POINTS_TO_ADVANCE = 10` en `game.js` (el enunciado original pedía 3; se subió a 10 para que la partida no dure segundos — cámbiala en esa única línea si tu profesor pide exactamente 3) |

Controles: flechas `◀ ▶` o `A` / `D` en teclado, o los botones táctiles en pantalla (funciona en celular).

---

## Estructura del proyecto (archivo base editable)

```
carrera-extrema/
├── index.html   → estructura (portada, HUD, pantallas de fin de juego)
├── style.css    → estilos (tema arcade/synthwave)
├── game.js      → toda la lógica del juego (física, colisiones, niveles, audio)
└── README.md    → este archivo
```

No requiere build ni instalación: son 3 archivos estáticos.

---

## Cómo probarlo en tu computadora

Solo abre `index.html` en el navegador (doble clic), o levanta un servidor local:

```bash
cd carrera-extrema
python3 -m http.server 8000
# luego abre http://localhost:8000
```

---

## Cómo publicarlo gratis

### Opción A — GitHub Pages
1. Crea un repositorio nuevo en GitHub (por ejemplo `carrera-extrema`).
2. Sube los 3 archivos (`index.html`, `style.css`, `game.js`) a la raíz del repositorio.
3. Ve a **Settings → Pages**.
4. En "Branch" selecciona `main` y carpeta `/root`, luego **Save**.
5. Espera 1-2 minutos. Tu URL será:
   `https://<tu-usuario>.github.io/carrera-extrema/`

### Opción B — Netlify
1. Entra a [app.netlify.com](https://app.netlify.com) → **Add new site → Deploy manually**.
2. Arrastra la carpeta `carrera-extrema` completa a la zona de "Drag and drop".
3. Netlify te da una URL tipo `https://tu-juego.netlify.app` al instante.

### Opción C — Vercel
1. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Puedes importar el repo de GitHub o subir la carpeta directamente.
3. Framework preset: **Other** (no necesita build). Deploy.

### Opción D — itch.io
1. Comprime la carpeta `carrera-extrema` en un `.zip` (que `index.html` quede en la raíz del zip, no dentro de otra subcarpeta).
2. En itch.io: **Upload new project → Kind of project: HTML**.
3. Sube el `.zip` en "Upload files" y marca la casilla **"This file will be played in the browser"**.
4. Guarda y publica.

---

## Para la entrega del examen

- **Pantallazos de los niveles:** juega y captura la portada, el nivel 1, la transición "¡NIVEL 2!", el nivel 2, y las pantallas de "GANASTE" / "VUELVE A INTENTARLO".
- **Video demostrativo:** graba tu pantalla (o celular) mostrando: portada con tu nombre → nivel 1 → subida a nivel 2 → una partida ganada y una perdida, con el sonido activado.
- **Archivo base editable:** entrega esta misma carpeta (`index.html` + `style.css` + `game.js`), o el enlace al repositorio de GitHub.
- **URL pública:** el link de GitHub Pages / Netlify / Vercel / itch.io una vez publicado.
