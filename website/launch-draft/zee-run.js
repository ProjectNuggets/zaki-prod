/*
 * ZEE RUN
 * A compact endless runner: guide ZEE over the digital-life obstacles that
 * pile up through the day. Patterns are deterministic and each level is faster.
 */
(function () {
  "use strict";

  var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var STORAGE_KEY = "zaki-zee-run-best-v1";
  var COLORS = {
    ink: "#0D0B09",
    paper: "#F8F2E9",
    world: "#E7D8C4",
    worldDeep: "#D4C0A8",
    accent: "#D24430",
    accentStrong: "#A33227",
    quiet: "#88735A"
  };
  var ui = {};
  var botImage = new Image();
  botImage.src = "/site/assets/zaki-worker-full.png";

  var OBSTACLES = {
    inbox: { w: 62, h: 60, emoji: "📥" },
    notification: { w: 60, h: 60, emoji: "🔔" },
    deadline: { w: 62, h: 62, emoji: "⏰" },
    loop: { w: 62, h: 60, emoji: "🔁" }
  };
  var EASY_PATTERNS = [
    [{ type: "inbox", x: 0 }],
    [{ type: "notification", x: 0 }],
    [{ type: "deadline", x: 0 }],
    [{ type: "loop", x: 0 }],
  ];
  var RUN_PATTERNS = [
    [{ type: "inbox", x: 0 }, { type: "notification", x: 680 }],
    [{ type: "deadline", x: 0 }, { type: "loop", x: 720 }],
    [{ type: "notification", x: 0 }, { type: "inbox", x: 660 }, { type: "deadline", x: 1360 }],
    [{ type: "loop", x: 0 }, { type: "deadline", x: 700 }]
  ];

  var game = {
    open: false,
    mode: "intro",
    root: null,
    canvas: null,
    ctx: null,
    raf: 0,
    last: 0,
    w: 0,
    h: 0,
    dpr: 1,
    elapsed: 0,
    distance: 0,
    score: 0,
    best: 0,
    level: 1,
    speed: 0,
    nextObstacle: 0,
    patternCursor: 0,
    jumpBuffer: 0,
    crashTimer: 0,
    levelPulse: 0,
    obstacles: [],
    sparks: [],
    player: null,
    flash: 0
  };

  function bridge() { return window.__csGameBridge || null; }
  function sfx(name) {
    var b = bridge();
    if (b && b.sfx) b.sfx(name);
  }
  function shake(amount, duration) {
    var b = bridge();
    if (!REDUCED && b && b.shake) b.shake(amount, duration);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function isMobile() { return game.w < 680; }
  function groundY() { return Math.round(clamp(game.h * 0.81, 290, game.h - 82)); }
  function zeeHeight() { return isMobile() ? 90 : 118; }

  function loadBest() {
    try { game.best = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0; } catch (e) { game.best = 0; }
  }
  function saveBest() {
    if (game.score <= game.best) return false;
    game.best = game.score;
    try { localStorage.setItem(STORAGE_KEY, String(game.best)); } catch (e) {}
    return true;
  }

  function injectCss() {
    if (document.getElementById("zee-run-css")) return;
    var style = document.createElement("style");
    style.id = "zee-run-css";
    style.textContent =
      ".zee-run{position:fixed;inset:0;z-index:2147483300;display:none;overflow:hidden;background:" + COLORS.world + ";color:" + COLORS.ink + ";font-family:'Bricolage Grotesque',sans-serif}" +
      ".zee-run.is-open{display:block}" +
      ".zee-run,.zee-run *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
      ".zee-run canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer}" +
      ".zee-run__hud{position:absolute;top:0;left:0;right:0;z-index:2;display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:start;padding:22px clamp(18px,4vw,54px);pointer-events:none}" +
      ".zee-run__metric{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.17em;color:rgba(13,11,9,.64);text-transform:uppercase}" +
      ".zee-run__metric b{display:block;margin-top:5px;font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(2rem,4vw,3.75rem);line-height:.86;letter-spacing:-.04em;color:" + COLORS.ink + "}" +
      ".zee-run__metric--right{text-align:right}" +
      ".zee-run__logo{margin-top:2px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:" + COLORS.accent + "}" +
      ".zee-run__card{position:absolute;z-index:3;left:50%;top:50%;width:min(500px,calc(100vw - 42px));transform:translate(-50%,-48%);padding:clamp(26px,4vw,46px);border:1px solid rgba(248,242,233,.42);background:" + COLORS.ink + ";box-shadow:10px 10px 0 " + COLORS.accentStrong + ";text-align:left}" +
      ".zee-run__card[hidden]{display:none!important}" +
      ".zee-run__eyebrow{margin:0 0 14px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:" + COLORS.accent + "}" +
      ".zee-run__title{margin:0;font-size:clamp(3rem,8vw,6.2rem);line-height:.78;letter-spacing:-.055em;color:" + COLORS.paper + "}" +
      ".zee-run__copy{max-width:34ch;margin:24px 0 0;font-size:clamp(1rem,1.8vw,1.25rem);line-height:1.45;color:rgba(248,242,233,.8)}" +
      ".zee-run__keys{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 0;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:rgba(248,242,233,.64)}" +
      ".zee-run__keys span{border:1px solid rgba(248,242,233,.3);padding:7px 9px}" +
      ".zee-run__actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:26px}" +
      ".zee-run__button{border:0;background:" + COLORS.accent + ";color:" + COLORS.ink + ";padding:14px 18px;font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;cursor:pointer;transition:transform .18s ease,background .18s ease}" +
      "@media (hover:hover) and (pointer:fine){.zee-run__button:hover{transform:translate(-2px,-2px);background:#EF654F}.zee-run__button--quiet:hover{background:rgba(248,242,233,.08)}.zee-run__exit:hover{background:" + COLORS.accent + ";border-color:" + COLORS.accent + ";color:" + COLORS.ink + "}}" +
      ".zee-run__button--quiet{background:transparent;border:1px solid rgba(248,242,233,.35);color:" + COLORS.paper + "}" +
      ".zee-run__exit{position:absolute;z-index:4;left:clamp(18px,4vw,54px);bottom:calc(18px + env(safe-area-inset-bottom));border:1px solid " + COLORS.ink + ";background:" + COLORS.ink + ";color:" + COLORS.paper + ";padding:10px 13px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}" +
      ".zee-run__prompt{position:absolute;z-index:2;right:clamp(18px,4vw,54px);bottom:calc(24px + env(safe-area-inset-bottom));margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(13,11,9,.7);pointer-events:none}" +
      "@media (max-width:640px){.zee-run__hud{padding:18px}.zee-run__metric b{font-size:2.2rem}.zee-run__logo{font-size:9px}.zee-run__card{transform:translate(-50%,-46%);padding:25px 23px;box-shadow:7px 7px 0 " + COLORS.accentStrong + "}.zee-run__title{font-size:3.7rem}.zee-run__copy{font-size:1rem}.zee-run__prompt{display:none}.zee-run__exit{left:18px;bottom:18px}}" +
      "@media (prefers-reduced-motion:reduce){.zee-run__button{transition:none}}";
    document.head.appendChild(style);
  }

  function build() {
    if (game.root) return;
    injectCss();
    var root = document.createElement("section");
    root.className = "zee-run";
    root.setAttribute("aria-label", "ZEE Run game");
    root.innerHTML =
      '<canvas aria-label="ZEE running and jumping over digital-life obstacles"></canvas>' +
      '<div class="zee-run__hud">' +
        '<div class="zee-run__metric">Score <b data-score>000</b></div>' +
        '<div class="zee-run__logo" data-mode-label>ZAKI / ZEE RUN</div>' +
        '<div class="zee-run__metric zee-run__metric--right">Best <b data-best>000</b></div>' +
      '</div>' +
      '<div class="zee-run__card" data-card role="dialog" aria-modal="true"></div>' +
      '<button type="button" class="zee-run__exit" data-exit>Back to site</button>' +
      '<p class="zee-run__prompt" data-prompt>Tap, click, Space, or Arrow Up to jump</p>';
    document.body.appendChild(root);
    game.root = root;
    game.canvas = root.querySelector("canvas");
    game.ctx = game.canvas.getContext("2d");
    ui.score = root.querySelector("[data-score]");
    ui.best = root.querySelector("[data-best]");
    ui.card = root.querySelector("[data-card]");
    ui.prompt = root.querySelector("[data-prompt]");
    ui.modeLabel = root.querySelector("[data-mode-label]");
    game.canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      if (game.mode === "playing") requestJump();
    });
    root.querySelector("[data-exit]").addEventListener("click", exit);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () { game.last = 0; });
  }

  function resize() {
    if (!game.canvas) return;
    game.dpr = Math.min(2, window.devicePixelRatio || 1);
    game.w = window.innerWidth;
    game.h = window.innerHeight;
    game.canvas.width = Math.round(game.w * game.dpr);
    game.canvas.height = Math.round(game.h * game.dpr);
    game.ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
    if (game.player) game.player.x = isMobile() ? 76 : Math.min(236, game.w * 0.22);
  }

  function updateHud() {
    ui.score.textContent = String(game.score).padStart(3, "0");
    ui.best.textContent = String(game.best).padStart(3, "0");
    if (ui.modeLabel) {
      if (game.mode === "playing" || game.mode === "crash") ui.modeLabel.textContent = "LEVEL " + String(game.level).padStart(2, "0") + " / " + Math.round(game.speed);
      else ui.modeLabel.textContent = "ZAKI / ZEE RUN";
    }
  }

  function card(html) {
    ui.card.innerHTML = html;
    ui.card.hidden = false;
  }
  function hideCard() { ui.card.hidden = true; }

  function showIntro() {
    game.mode = "intro";
    ui.prompt.style.display = "none";
    card(
      '<p class="zee-run__eyebrow">A fast digital-life runner</p>' +
      '<h2 class="zee-run__title">ZEE<br>RUN</h2>' +
      '<p class="zee-run__copy">Jump the inboxes, notifications, deadlines, and loops in ZEE’s way. Every level runs faster.</p>' +
      '<div class="zee-run__keys"><span>Tap / Click</span><span>Space</span><span>Arrow Up</span><span>Jump</span></div>' +
      '<div class="zee-run__actions"><button type="button" class="zee-run__button" data-start>Start run</button><button type="button" class="zee-run__button zee-run__button--quiet" data-close>Exit</button></div>'
    );
    ui.card.querySelector("[data-start]").addEventListener("click", startRun);
    ui.card.querySelector("[data-close]").addEventListener("click", exit);
  }

  function showResult(isBest) {
    game.mode = "result";
    ui.prompt.style.display = "none";
    card(
      '<p class="zee-run__eyebrow">Run interrupted</p>' +
      '<h2 class="zee-run__title">' + String(game.score).padStart(3, "0") + '</h2>' +
      '<p class="zee-run__copy">' + (isBest ? "New personal best. " : "") + 'You reached level ' + game.level + ' with ' + game.score + ' points.</p>' +
      '<div class="zee-run__actions"><button type="button" class="zee-run__button" data-retry>Run again</button><button type="button" class="zee-run__button zee-run__button--quiet" data-close>Exit</button></div>'
    );
    ui.card.querySelector("[data-retry]").addEventListener("click", startRun);
    ui.card.querySelector("[data-close]").addEventListener("click", exit);
  }

  function startRun() {
    game.mode = "playing";
    game.elapsed = 0;
    game.distance = 0;
    game.score = 0;
    game.level = 1;
    game.speed = REDUCED ? 300 : (isMobile() ? 330 : 360);
    game.nextObstacle = 0.55;
    game.patternCursor = 0;
    game.jumpBuffer = 0;
    game.crashTimer = 0;
    game.levelPulse = 0;
    game.obstacles = [];
    game.sparks = [];
    game.flash = 0;
    game.player = {
      x: isMobile() ? 76 : Math.min(236, game.w * 0.22),
      y: groundY(),
      vy: 0,
      grounded: true,
      run: 0,
      coyote: 0.1,
      landPulse: 0
    };
    hideCard();
    ui.prompt.style.display = isMobile() ? "none" : "block";
    updateHud();
    sfx("pop");
  }

  function requestJump() {
    if (!game.player) return;
    game.jumpBuffer = 0.14;
  }

  function performJump() {
    var p = game.player;
    if (!p || (!p.grounded && p.coyote <= 0)) return;
    p.vy = isMobile() ? -625 : -690;
    p.grounded = false;
    p.coyote = 0;
    game.jumpBuffer = 0;
    burst(p.x + 14, p.y - 10, 10, COLORS.accent);
    sfx("flip");
  }

  function addObstacle(type, x) {
    var spec = OBSTACLES[type];
    game.obstacles.push({ x: x, w: spec.w, h: spec.h, type: type, passed: false });
  }

  function spawnPattern() {
    var patterns = game.level < 3 ? EASY_PATTERNS : RUN_PATTERNS;
    var pattern = patterns[game.patternCursor % patterns.length];
    var startX = game.player.x + game.speed * 2.2;
    var lastX = 0;
    for (var i = 0; i < pattern.length; i += 1) {
      addObstacle(pattern[i].type, startX + pattern[i].x);
      lastX = pattern[i].x;
    }
    game.patternCursor += 1;
    game.nextObstacle = game.elapsed + Math.max(1.05, (lastX + 560) / Math.max(300, game.speed));
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function burst(x, y, count, color) {
    if (REDUCED) return;
    for (var i = 0; i < count; i += 1) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 180;
      game.sparks.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.42, color: color });
    }
  }

  function crash() {
    if (game.mode !== "playing") return;
    game.mode = "crash";
    game.crashTimer = 0;
    game.flash = 0.45;
    burst(game.player.x + 20, game.player.y - 34, 36, COLORS.accent);
    shake(0.38, 220);
    sfx("stamp");
  }

  function update(dt) {
    if (game.mode === "crash") {
      game.crashTimer += dt;
      game.flash = Math.max(0, game.flash - dt);
      updateSparks(dt);
      if (game.crashTimer > 0.68) showResult(saveBest());
      return;
    }
    if (game.mode !== "playing") return;

    game.elapsed += dt;
    game.flash = Math.max(0, game.flash - dt);
    game.levelPulse = Math.max(0, game.levelPulse - dt);
    game.jumpBuffer = Math.max(0, game.jumpBuffer - dt);
    var previousLevel = game.level;
    game.level = Math.min(12, 1 + Math.floor(game.elapsed / 8));
    var speedCap = REDUCED ? 480 : 720;
    var acceleration = REDUCED ? 10 : 18;
    game.speed = Math.min(speedCap, game.speed + dt * acceleration);
    var travelSpeed = game.speed;
    if (game.level !== previousLevel) {
      game.flash = 0.18;
      game.levelPulse = 0.8;
      burst(game.player.x, game.player.y - 36, 24, COLORS.accent);
      sfx("pop");
    }
    game.distance += travelSpeed * dt;
    game.score = Math.max(game.score, Math.floor(game.distance / 38));
    var p = game.player;
    p.run += dt * (p.grounded ? game.speed * 0.06 : 3);
    p.landPulse = Math.max(0, p.landPulse - dt * 5.5);
    if (p.grounded) p.coyote = 0.1;
    else p.coyote = Math.max(0, p.coyote - dt);
    if (game.jumpBuffer > 0 && (p.grounded || p.coyote > 0)) performJump();
    var wasGrounded = p.grounded;
    p.vy += 1750 * dt;
    p.y += p.vy * dt;
    if (p.y >= groundY()) {
      p.y = groundY();
      p.vy = 0;
      p.grounded = true;
      if (!wasGrounded) {
        p.landPulse = 1;
        burst(p.x, p.y - 3, 8, COLORS.quiet);
      }
    }
    if (game.elapsed >= game.nextObstacle) spawnPattern();

    var scale = zeeHeight() / 94;
    var playerBoxes = [
      { x: p.x - 22 * scale, y: p.y - 84 * scale, w: 44 * scale, h: 38 * scale },
      { x: p.x - 18 * scale, y: p.y - 47 * scale, w: 36 * scale, h: 30 * scale },
      { x: p.x - 14 * scale, y: p.y - 17 * scale, w: 28 * scale, h: 15 * scale }
    ];
    for (var i = game.obstacles.length - 1; i >= 0; i -= 1) {
      var obstacle = game.obstacles[i];
      obstacle.x -= travelSpeed * dt;
      if (!obstacle.passed && obstacle.x + obstacle.w < p.x - 14) {
        obstacle.passed = true;
        game.score += 3;
      }
      var obstacleBox = {
        x: obstacle.x + 8,
        y: groundY() - obstacle.h + 8,
        w: obstacle.w - 16,
        h: obstacle.h - 10
      };
      var hit = false;
      for (var boxIndex = 0; boxIndex < playerBoxes.length; boxIndex += 1) {
        if (rectsOverlap(playerBoxes[boxIndex], obstacleBox)) { hit = true; break; }
      }
      if (hit) {
        crash();
      }
      if (obstacle.x + obstacle.w < -100) game.obstacles.splice(i, 1);
    }
    updateSparks(dt);
    updateHud();
  }

  function updateSparks(dt) {
    for (var i = game.sparks.length - 1; i >= 0; i -= 1) {
      var spark = game.sparks[i];
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 280 * dt;
      if (spark.life <= 0) game.sparks.splice(i, 1);
    }
  }

  function drawBackdrop(ctx) {
    ctx.fillStyle = COLORS.world;
    ctx.fillRect(0, 0, game.w, game.h);
    ctx.save();
    ctx.strokeStyle = "rgba(13,11,9,.08)";
    ctx.lineWidth = 1;
    for (var y = 118; y < groundY() - 70; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(game.w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRail(ctx) {
    var y = groundY();
    ctx.save();
    ctx.fillStyle = COLORS.worldDeep;
    ctx.fillRect(0, y + 4, game.w, Math.max(0, game.h - y));
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y + 3);
    ctx.lineTo(game.w, y + 3);
    ctx.stroke();
    ctx.strokeStyle = "rgba(13,11,9,.18)";
    ctx.lineWidth = 1;
    for (var x = 24; x < game.w; x += 52) {
      ctx.beginPath();
      ctx.moveTo(x, y + 14);
      ctx.lineTo(x + 22, y + 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawObstacle(ctx, obstacle) {
    var spec = OBSTACLES[obstacle.type];
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.ellipse(obstacle.x + obstacle.w * 0.5, groundY() + 2, 19, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = "52px 'Apple Color Emoji','Segoe UI Emoji',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(spec.emoji, obstacle.x + obstacle.w * 0.5, groundY() + 1);
    ctx.restore();
  }

  function drawFallbackZee(ctx, x, bottom, run) {
    ctx.save();
    var bob = Math.sin(run) * 2;
    ctx.translate(x, bottom + bob);
    ctx.fillStyle = COLORS.accentStrong;
    ctx.fillRect(-22, -58, 44, 31);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(-19, -55, 38, 26);
    ctx.fillRect(-15, -26, 30, 22);
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(-12, -49, 8, 8);
    ctx.fillRect(4, -49, 8, 8);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(-9, -46, 4, 4);
    ctx.fillRect(7, -46, 4, 4);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(-14, -4, 10, 11 + Math.abs(Math.sin(run)) * 3);
    ctx.fillRect(4, -4, 10, 11 + Math.abs(Math.cos(run)) * 3);
    ctx.restore();
  }

  function drawZee(ctx) {
    if (!game.player) return;
    var p = game.player;
    var airborne = !p.grounded;
    var wobble = airborne ? -0.08 : Math.sin(p.run) * 0.045;
    var h = zeeHeight();
    var w = h * 0.77;
    var squash = p.landPulse || 0;
    ctx.save();
    ctx.globalAlpha = airborne ? 0.16 : 0.24;
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 3, w * (airborne ? 0.24 : 0.42), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (game.speed > 480 && !REDUCED) {
      ctx.save();
      for (var trail = 0; trail < 3; trail += 1) {
        ctx.globalAlpha = 0.15 - trail * 0.035;
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - 42 - trail * 22, p.y - 32 - trail * 9);
        ctx.lineTo(p.x - 16 - trail * 16, p.y - 32 - trail * 4);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(p.x, p.y + (p.grounded ? Math.sin(p.run) * 2.6 : 0));
    ctx.rotate(wobble);
    ctx.scale(1 + squash * 0.08 + (p.grounded ? Math.sin(p.run * 2) * 0.018 : 0), 1 - squash * 0.07);
    ctx.imageSmoothingEnabled = false;
    if (botImage.complete && botImage.naturalWidth) {
      ctx.drawImage(botImage, -w * 0.5, -h, w, h);
    } else {
      drawFallbackZee(ctx, 0, 0, p.run);
    }
    ctx.restore();
  }

  function drawSparks(ctx) {
    ctx.save();
    for (var i = 0; i < game.sparks.length; i += 1) {
      var spark = game.sparks[i];
      ctx.globalAlpha = clamp(spark.life * 2.3, 0, 1);
      ctx.fillStyle = spark.color;
      ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
    }
    ctx.restore();
  }

  function render() {
    var ctx = game.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, game.w, game.h);
    drawBackdrop(ctx);
    drawRail(ctx);
    for (var i = 0; i < game.obstacles.length; i += 1) drawObstacle(ctx, game.obstacles[i]);
    drawZee(ctx);
    drawSparks(ctx);
    if (game.levelPulse > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(game.levelPulse * 1.5, 0, 1);
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = "center";
      ctx.font = "800 " + (isMobile() ? 30 : 46) + "px 'Bricolage Grotesque',sans-serif";
      ctx.fillText("LEVEL " + String(game.level).padStart(2, "0"), game.w * 0.5, game.h * 0.32);
      ctx.fillStyle = COLORS.accent;
      ctx.font = "10px 'Geist Mono',monospace";
      ctx.fillText("FASTER", game.w * 0.5, game.h * 0.32 + 24);
      ctx.restore();
    }
    if (game.flash > 0) {
      ctx.fillStyle = "rgba(210,68,48," + (game.flash * 0.4) + ")";
      ctx.fillRect(0, 0, game.w, game.h);
    }
  }

  function loop(now) {
    if (!game.open) return;
    if (!game.last) game.last = now;
    var dt = Math.min(0.04, Math.max(0, (now - game.last) / 1000));
    game.last = now;
    update(dt);
    render();
    game.raf = requestAnimationFrame(loop);
  }

  function onKey(event) {
    if (!game.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      exit();
      return;
    }
    if (event.key === " " || event.key === "ArrowUp" || event.key === "Enter") {
      if (game.mode === "playing") {
        event.preventDefault();
        requestJump();
      } else if (game.mode === "intro" || game.mode === "result") {
        event.preventDefault();
        startRun();
      }
    }
  }

  function open() {
    build();
    if (game.open) return;
    game.open = true;
    window.__csGameEverOpened = true;
    document.documentElement.classList.add("cs-gaming");
    if (window.__lenis && window.__lenis.stop) { try { window.__lenis.stop(); } catch (e) {} }
    document.documentElement.style.overflow = "hidden";
    loadBest();
    resize();
    updateHud();
    game.root.classList.add("is-open");
    showIntro();
    game.last = 0;
    game.raf = requestAnimationFrame(loop);
  }

  function close() {
    if (!game.open) return;
    game.open = false;
    cancelAnimationFrame(game.raf);
    game.root.classList.remove("is-open");
    document.documentElement.classList.remove("cs-gaming");
    document.documentElement.style.overflow = "";
    if (window.__lenis && window.__lenis.start) { try { window.__lenis.start(); } catch (e) {} }
  }

  function exit() {
    if (window.__csGameOnly) {
      window.location.href = "/";
      return;
    }
    close();
  }

  window.__csGame = {
    open: open,
    close: close,
    start: function () { if (!game.open) open(); startRun(); },
    state: function () {
      return {
        mode: game.mode,
        score: game.score,
        best: game.best,
        level: game.level,
        speed: Math.round(game.speed)
      };
    }
  };
})();
