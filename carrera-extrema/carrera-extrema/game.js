/* =========================================================
   CARRERA EXTREMA
   Juego de carros — Examen
   Autor: Elio Jose Gabancho Catunta
   ========================================================= */

(() => {
  "use strict";

  /* ---------------- Canvas & DOM ---------------- */
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const screens = {
    cover: document.getElementById("screen-cover"),
    transition: document.getElementById("screen-level-transition"),
    gameover: document.getElementById("screen-gameover"),
    win: document.getElementById("screen-win"),
  };
  const hud = document.getElementById("hud");
  const touchControls = document.getElementById("touch-controls");

  const hudLevel = document.getElementById("hud-level");
  const hudPoints = document.getElementById("hud-points");
  const hudPointsMax = document.getElementById("hud-points-max");
  const hudScore = document.getElementById("hud-score");
  const hudLives = document.getElementById("hud-lives");
  const gameoverScoreEl = document.getElementById("gameover-score");
  const winScoreEl = document.getElementById("win-score");
  const pointsTargetCover = document.getElementById("points-target-cover");

  const btnStart = document.getElementById("btn-start");
  const btnRetry = document.getElementById("btn-retry");
  const btnPlayAgain = document.getElementById("btn-playagain");
  const btnMute = document.getElementById("btn-mute");
  const btnLeft = document.getElementById("btn-left");
  const btnRight = document.getElementById("btn-right");

  /* ---------------- Geometría de la pista ---------------- */
  const ROAD_MARGIN = 46;         // ancho de cada borde con cebra
  const ROAD_LEFT = ROAD_MARGIN;
  const ROAD_RIGHT = W - ROAD_MARGIN;
  const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;

  /* ---------------- Configuración de niveles ---------------- */
  const LEVELS = {
    1: {
      spawnInterval: 1000,      // ms entre apariciones
      speedMin: 130,
      speedMax: 190,
      scrollSpeed: 170,
      obstacleTypes: ["car_yellow", "barrel"],
      musicTempo: 420,
      engineFreq: 55,
    },
    2: {
      spawnInterval: 680,
      speedMin: 230,
      speedMax: 330,
      scrollSpeed: 300,
      obstacleTypes: ["car_blue", "car_green", "barrel_fast"],
      musicTempo: 260,
      engineFreq: 78,
    },
  };
  const POINTS_TO_ADVANCE = 10;
  const START_LIVES = 3;
  const INVULN_TIME = 1.2;

  // Refleja el valor de POINTS_TO_ADVANCE en la portada y el HUD
  if (hudPointsMax) hudPointsMax.textContent = POINTS_TO_ADVANCE;
  if (pointsTargetCover) pointsTargetCover.textContent = POINTS_TO_ADVANCE;

  /* ---------------- Estado del juego ---------------- */
  let state = "cover"; // cover | playing | transition | gameover | win
  let level = 1;
  let score = 0;
  let levelPoints = 0;
  let lives = START_LIVES;
  let obstacles = [];
  let spawnTimer = 0;
  let roadOffset = 0;
  let lastTime = 0;
  let keys = {};

  const player = {
    x: W / 2 - 20,
    y: H - 130,
    w: 40,
    h: 64,
    speed: 300,
    invulnerable: false,
    invulnTimer: 0,
  };

  /* =========================================================
     AUDIO — sintetizado con Web Audio API (sin archivos externos)
     ========================================================= */
  let audioCtx = null;
  let masterGain = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let musicIntervalId = null;
  let musicStep = 0;

  const MELODY = [220.0, 246.94, 261.63, 329.63, 293.66, 246.94, 220.0, 196.0];

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(audioCtx.destination);
  }

  function startEngineHum(freq) {
    if (!audioCtx) return;
    stopEngineHum();
    engineOsc = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = freq;
    engineGain.gain.value = 0.035;
    engineOsc.connect(engineGain).connect(masterGain);
    engineOsc.start();
  }
  function setEngineFreq(freq) {
    if (engineOsc) engineOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.3);
  }
  function stopEngineHum() {
    if (engineOsc) {
      try { engineOsc.stop(); } catch (e) {}
      engineOsc.disconnect();
      engineOsc = null;
    }
  }

  function playNote(freq, duration, type = "square", vol = 0.05) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(g).connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function startMusic(tempo) {
    stopMusic();
    musicStep = 0;
    musicIntervalId = setInterval(() => {
      playNote(MELODY[musicStep % MELODY.length], tempo / 1000 * 0.85, "square", 0.045);
      musicStep++;
    }, tempo);
  }
  function stopMusic() {
    if (musicIntervalId) clearInterval(musicIntervalId);
    musicIntervalId = null;
  }

  function playCollisionSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, audioCtx.currentTime + 0.28);
    g.gain.setValueAtTime(0.32, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    osc.connect(g).connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);

    // ruido corto adicional (estilo "crash")
    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const ng = audioCtx.createGain();
    ng.gain.value = 0.22;
    noise.connect(ng).connect(masterGain);
    noise.start();
  }

  function playWinFanfare() {
    if (!audioCtx) return;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => setTimeout(() => playNote(f, 0.35, "square", 0.07), i * 140));
  }
  function playLoseJingle() {
    if (!audioCtx) return;
    const notes = [330, 262, 220, 165];
    notes.forEach((f, i) => setTimeout(() => playNote(f, 0.4, "triangle", 0.06), i * 160));
  }

  btnMute.addEventListener("click", () => {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.9;
    btnMute.textContent = muted ? "🔇" : "🔊";
  });

  /* =========================================================
     ENTRADA
     ========================================================= */
  const NAV_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
  window.addEventListener("keydown", (e) => {
    if (NAV_KEYS.includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if (state === "cover" && (e.key === "Enter" || e.key === " ")) startGame();
  });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  function bindHold(el, key) {
    const on = (e) => { e.preventDefault(); keys[key] = true; };
    const off = (e) => { keys[key] = false; };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("pointercancel", off);
  }
  bindHold(btnLeft, "ArrowLeft");
  bindHold(btnRight, "ArrowRight");

  btnStart.addEventListener("click", startGame);
  btnRetry.addEventListener("click", startGame);
  btnPlayAgain.addEventListener("click", startGame);

  /* =========================================================
     CICLO DE ESTADOS
     ========================================================= */
  function showOnly(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
  }

  function resetGame() {
    level = 1;
    score = 0;
    levelPoints = 0;
    lives = START_LIVES;
    obstacles = [];
    spawnTimer = 0;
    roadOffset = 0;
    player.x = W / 2 - player.w / 2;
    player.invulnerable = false;
    player.invulnTimer = 0;
    keys = {};
  }

  function startGame() {
    initAudio();
    if (audioCtx.state === "suspended") audioCtx.resume();
    resetGame();
    state = "playing";
    showOnly(null);
    hud.classList.remove("hidden");
    touchControls.classList.remove("hidden");
    updateHud();
    startEngineHum(LEVELS[1].engineFreq);
    startMusic(LEVELS[1].musicTempo);
  }

  function goToLevel2() {
    state = "transition";
    stopMusic();
    showOnly("transition");
    setTimeout(() => {
      level = 2;
      levelPoints = 0;
      obstacles = [];
      showOnly(null);
      state = "playing";
      updateHud();
      setEngineFreq(LEVELS[2].engineFreq);
      startMusic(LEVELS[2].musicTempo);
    }, 1900);
  }

  function gameOver() {
    state = "gameover";
    stopMusic();
    stopEngineHum();
    playLoseJingle();
    hud.classList.add("hidden");
    touchControls.classList.add("hidden");
    gameoverScoreEl.textContent = `Score final: ${score}  ·  Nivel alcanzado: ${level}`;
    showOnly("gameover");
  }

  function winGame() {
    state = "win";
    stopMusic();
    stopEngineHum();
    playWinFanfare();
    hud.classList.add("hidden");
    touchControls.classList.add("hidden");
    winScoreEl.textContent = `Score final: ${score}`;
    showOnly("win");
  }

  function updateHud() {
    hudLevel.textContent = level;
    hudPoints.textContent = levelPoints;
    hudScore.textContent = score;
    hudLives.innerHTML = "🚗".repeat(Math.max(lives, 0));
  }

  /* =========================================================
     OBSTÁCULOS
     ========================================================= */
  function spawnObstacle() {
    const cfg = LEVELS[level];
    const type = cfg.obstacleTypes[Math.floor(Math.random() * cfg.obstacleTypes.length)];
    const isCar = type.startsWith("car");
    const w = isCar ? 40 : 32;
    const h = isCar ? 62 : 40;
    const x = ROAD_LEFT + 8 + Math.random() * (ROAD_WIDTH - 16 - w);
    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    obstacles.push({ type, x, y: -h, w, h, speed, collided: false, rot: 0 });
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* =========================================================
     ACTUALIZACIÓN
     ========================================================= */
  function update(dt) {
    const cfg = LEVELS[level];

    // scroll visual de la pista
    roadOffset = (roadOffset + cfg.scrollSpeed * dt) % 10000;

    // movimiento del jugador
    let dx = 0;
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dx -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx += 1;
    player.x += dx * player.speed * dt;
    player.x = Math.max(ROAD_LEFT + 6, Math.min(ROAD_RIGHT - player.w - 6, player.x));

    // invulnerabilidad
    if (player.invulnerable) {
      player.invulnTimer -= dt;
      if (player.invulnTimer <= 0) player.invulnerable = false;
    }

    // generación de obstáculos
    spawnTimer += dt * 1000;
    if (spawnTimer > cfg.spawnInterval) {
      spawnTimer = 0;
      spawnObstacle();
    }

    // actualizar obstáculos
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.speed * dt;
      o.rot += dt * (o.type.includes("barrel") ? 6 : 0);

      if (!player.invulnerable && !o.collided && aabb(player, o)) {
        o.collided = true;
        lives -= 1;
        player.invulnerable = true;
        player.invulnTimer = INVULN_TIME;
        playCollisionSound();
        obstacles.splice(i, 1);
        updateHud();
        if (lives <= 0) {
          gameOver();
          return;
        }
        continue;
      }

      if (o.y > H) {
        obstacles.splice(i, 1);
        if (!o.collided) {
          score += 1;
          levelPoints += 1;
          updateHud();
        }
      }
    }

    if (levelPoints >= POINTS_TO_ADVANCE) {
      if (level === 1) { goToLevel2(); return; }
      if (level === 2) { winGame(); return; }
    }
  }

  /* =========================================================
     DIBUJO
     ========================================================= */
  function drawRoad() {
    // césped / fondo exterior
    ctx.fillStyle = "#0d0221";
    ctx.fillRect(0, 0, W, H);

    // asfalto
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#3a3a46");
    grad.addColorStop(1, "#26262e");
    ctx.fillStyle = grad;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

    // bordes tipo cebra
    const seg = 22;
    const offset = roadOffset % (seg * 2);
    for (let side = 0; side < 2; side++) {
      const bx = side === 0 ? 0 : ROAD_RIGHT;
      const bw = ROAD_MARGIN;
      for (let y = -seg * 2; y < H + seg * 2; y += seg) {
        const yy = y + offset;
        const isWhite = Math.floor((yy) / seg) % 2 === 0;
        ctx.fillStyle = isWhite ? "#f4f1ea" : "#141414";
        ctx.fillRect(bx, yy, bw, seg);
      }
    }

    // líneas centrales discontinuas (2 divisiones -> 3 carriles)
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 4;
    ctx.setLineDash([22, 20]);
    ctx.lineDashOffset = -roadOffset;
    [1 / 3, 2 / 3].forEach((frac) => {
      const lx = ROAD_LEFT + ROAD_WIDTH * frac;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, H);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Silueta de un auto visto desde arriba: capó angosto, guardabarros
  // redondeados y cola más ancha — en vez de un simple rectángulo.
  function carBodyPath(w, h) {
    const noseW = w * 0.62;     // ancho del capó (frente)
    const noseX = (w - noseW) / 2;
    ctx.beginPath();
    ctx.moveTo(noseX + 5, h * 0.02);
    ctx.lineTo(noseX + noseW - 5, h * 0.02);
    ctx.quadraticCurveTo(noseX + noseW, h * 0.02, noseX + noseW + 2, h * 0.10);
    ctx.lineTo(w * 0.88, h * 0.30);
    ctx.quadraticCurveTo(w, h * 0.36, w, h * 0.48);
    ctx.lineTo(w, h * 0.88);
    ctx.quadraticCurveTo(w, h * 0.99, w * 0.88, h * 0.99);
    ctx.lineTo(w * 0.12, h * 0.99);
    ctx.quadraticCurveTo(0, h * 0.99, 0, h * 0.88);
    ctx.lineTo(0, h * 0.48);
    ctx.quadraticCurveTo(0, h * 0.36, w * 0.12, h * 0.30);
    ctx.lineTo(noseX - 2, h * 0.10);
    ctx.quadraticCurveTo(noseX, h * 0.02, noseX + 5, h * 0.02);
    ctx.closePath();
  }

  function drawCar(x, y, w, h, body, dark, light, accent) {
    ctx.save();
    ctx.translate(x, y);

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(w / 2, h + 4, w * 0.42, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ruedas (dibujadas antes para que la carrocería tape la mitad,
    // dando el efecto de que salen por debajo de los guardabarros)
    ctx.fillStyle = "#141414";
    roundRect(-3, h * 0.16, 7, h * 0.22, 2); ctx.fill();
    roundRect(w - 4, h * 0.16, 7, h * 0.22, 2); ctx.fill();
    roundRect(-3, h * 0.62, 7, h * 0.22, 2); ctx.fill();
    roundRect(w - 4, h * 0.62, 7, h * 0.22, 2); ctx.fill();

    // carrocería con degradado lateral (simula volumen/curvatura)
    carBodyPath(w, h);
    const bodyGrad = ctx.createLinearGradient(0, 0, w, 0);
    bodyGrad.addColorStop(0, dark);
    bodyGrad.addColorStop(0.18, body);
    bodyGrad.addColorStop(0.5, light);
    bodyGrad.addColorStop(0.82, body);
    bodyGrad.addColorStop(1, dark);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();

    // parabrisas delantero
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.16);
    ctx.lineTo(w * 0.76, h * 0.16);
    ctx.lineTo(w * 0.66, h * 0.34);
    ctx.lineTo(w * 0.34, h * 0.34);
    ctx.closePath();
    ctx.fill();

    // techo
    ctx.fillStyle = accent || light;
    ctx.globalAlpha = 0.9;
    roundRect(w * 0.28, h * 0.36, w * 0.44, h * 0.26, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    // luneta trasera
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.64);
    ctx.lineTo(w * 0.7, h * 0.64);
    ctx.lineTo(w * 0.78, h * 0.82);
    ctx.lineTo(w * 0.22, h * 0.82);
    ctx.closePath();
    ctx.fill();

    // espejos laterales
    ctx.fillStyle = "#161616";
    ctx.fillRect(-4, h * 0.3, 4, 6);
    ctx.fillRect(w, h * 0.3, 4, 6);

    // faros delanteros
    ctx.fillStyle = "#fff6b0";
    roundRect(w * 0.2, h * 0.015, w * 0.16, 5, 2); ctx.fill();
    roundRect(w * 0.64, h * 0.015, w * 0.16, 5, 2); ctx.fill();

    // luces traseras
    ctx.fillStyle = "#ff3b3b";
    roundRect(w * 0.08, h * 0.94, w * 0.16, 4, 2); ctx.fill();
    roundRect(w * 0.76, h * 0.94, w * 0.16, 4, 2); ctx.fill();

    // franja central (color de acento)
    ctx.fillStyle = accent || light;
    ctx.fillRect(w * 0.47, h * 0.02, w * 0.06, h * 0.96);

    ctx.restore();
  }

  function drawBarrel(x, y, w, h, fast) {
    ctx.save();
    ctx.translate(x, y);

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(w / 2, h + 3, w * 0.46, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyColor = fast ? "#4a3220" : "#5c4028";
    const bandColor = fast ? "#e0954a" : "#c9a24a";

    // cuerpo cilíndrico con degradado para dar volumen
    roundRect(0, h * 0.05, w, h * 0.93, 7);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#241609");
    grad.addColorStop(0.16, bodyColor);
    grad.addColorStop(0.5, fast ? "#6a4526" : "#7a5636");
    grad.addColorStop(0.84, bodyColor);
    grad.addColorStop(1, "#241609");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();

    // bandas metálicas (aros)
    ctx.fillStyle = bandColor;
    ctx.fillRect(0, h * 0.2, w, h * 0.1);
    ctx.fillRect(0, h * 0.68, w, h * 0.1);

    // tapa superior (elipse) — remata la silueta cilíndrica
    ctx.fillStyle = fast ? "#6a4526" : "#7a5636";
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.07, w * 0.48, h * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // símbolo de peligro
    ctx.fillStyle = "rgba(255,210,63,0.85)";
    ctx.font = `${Math.floor(w * 0.42)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", w / 2, h * 0.48);

    // brillo lateral
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(w * 0.16, h * 0.12, w * 0.14, h * 0.7);

    ctx.restore();
  }

  const OBSTACLE_STYLES = {
    car_yellow: { body: "#f4d93f", dark: "#5a4c10", light: "#fff6cf", accent: "#ff8c1a" },
    car_blue:   { body: "#2f8cff", dark: "#0e2c55", light: "#c3e2ff", accent: "#00e5ff" },
    car_green:  { body: "#3fcf6e", dark: "#0f4a24", light: "#d3ffe1", accent: "#e8ff5c" },
  };

  function drawObstacle(o) {
    if (o.type === "barrel") drawBarrel(o.x, o.y, o.w, o.h, false);
    else if (o.type === "barrel_fast") drawBarrel(o.x, o.y, o.w, o.h, true);
    else {
      const s = OBSTACLE_STYLES[o.type] || OBSTACLE_STYLES.car_yellow;
      drawCar(o.x, o.y, o.w, o.h, s.body, s.dark, s.light, s.accent);
    }
  }

  function draw() {
    drawRoad();
    obstacles.forEach(drawObstacle);

    if (state === "playing" || state === "transition") {
      const blink = player.invulnerable && Math.floor(player.invulnTimer * 12) % 2 === 0;
      if (!blink) drawCar(player.x, player.y, player.w, player.h, "#ff3355", "#3a0e14", "#ffd8dc", "#ffe14d");
    }
  }

  /* =========================================================
     BUCLE PRINCIPAL
     ========================================================= */
  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000 || 0, 0.05);
    lastTime = ts;
    if (state === "playing") update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Dibujo inicial (portada visible sobre el canvas)
  drawRoad();
  drawCar(player.x, player.y, player.w, player.h, "#ff3355", "#3a0e14", "#ffd8dc", "#ffe14d");
  requestAnimationFrame(loop);
})();
