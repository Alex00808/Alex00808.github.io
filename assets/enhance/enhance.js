/*
 * Alex's Little World — presentation layer.
 *
 * Runs next to the published Next.js bundle. The bundle calls three hooks
 * (see ENHANCEMENTS.md): init(ctx) once the WebGL scene exists, camera(...)
 * right after it positions the camera each frame, and frame(...) right before
 * it renders. Everything here is additive: if this file fails to load, the
 * original site keeps working unchanged.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const smallScreen = window.matchMedia("(max-width: 680px)");
  // ?alx-capture=intro|hero renders a clean still (used to make the loader poster and share image)
  const capture = new URLSearchParams(window.location.search).get("alx-capture");
  if (capture) root.classList.add("alx-capture");

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (a, b, v) => {
    const t = clamp01((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* private mode: keep going without persistence */
      }
    },
  };

  const copy = {
    zh: { menu: "菜单", close: "关闭菜单", soundOn: "打开环境声音", soundOff: "关闭环境声音", knock: "敲敲烟囱？" },
    en: { menu: "Menu", close: "Close menu", soundOn: "Turn ambient sound on", soundOff: "Turn ambient sound off", knock: "Knock on the chimney?" },
    de: { menu: "Menü", close: "Menü schließen", soundOn: "Umgebungsklang an", soundOff: "Umgebungsklang aus", knock: "Am Schornstein klopfen?" },
  };
  const lang = () => {
    const shell = document.querySelector(".site-shell");
    const id = shell && shell.dataset.language;
    return copy[id] ? id : "zh";
  };

  /* ------------------------------------------------------------------ */
  /* 3D hooks                                                            */
  /* ------------------------------------------------------------------ */

  const world = {
    ctx: null,
    shell: null,
    progress: 0,
    night: 0,
    pointer: { x: 0, y: 0, sx: 0, sy: 0, active: false },
    intro: { state: "waiting", elapsed: 0, duration: 3900 },
    lamp: { materials: [], fade: 1, center: null },
    chimney: { corners: null, rect: null },
    tilt: 0,
    lastTime: performance.now(),
    frames: 0,
    broken: false,
  };

  // Never let a presentation effect take the 3D world down with it.
  function reportOnce(label, error) {
    if (world.broken) return;
    world.broken = true;
    root.classList.remove("alx-intro-running");
    root.classList.add("alx-intro-done", "alx-drawn");
    if (window.console) console.error("[alex-world] " + label + " disabled:", error);
  }
  const guard = (label, fn) =>
    function guarded() {
      if (world.broken) return undefined;
      try {
        return fn.apply(this, arguments);
      } catch (error) {
        reportOnce(label, error);
        return undefined;
      }
    };

  // Some GPU drivers reject shaders that others accept. If the colour-grade pass (which also
  // carries the tilt-shift) fails to compile, drop the tilt-shift and recompile the original grade.
  const TILT_BLOCK = /\/\*ALX_TILT\*\/[\s\S]*?\/\*ALX_TILT_END\*\//;
  const reportedPrograms = new WeakSet();
  function checkShaders(ctx) {
    const programs = (ctx.renderer.info && ctx.renderer.info.programs) || [];
    const failed = programs.filter(
      (p) => p.diagnostics && p.diagnostics.runnable === false && !reportedPrograms.has(p),
    );
    if (!failed.length) return false;
    failed.forEach((p) => reportedPrograms.add(p));
    const grade = ctx.grade && ctx.grade();
    const material = grade && grade.material;
    if (material && TILT_BLOCK.test(material.fragmentShader)) {
      material.fragmentShader = material.fragmentShader.replace(TILT_BLOCK, "");
      material.needsUpdate = true;
      world.noTilt = true;
      if (window.console) console.warn("[alex-world] tilt-shift shader rejected by this GPU; using the plain grade");
      return true;
    }
    if (window.console) console.warn("[alex-world] shader programs failed:", failed.map((p) => p.name).join(", "));
    return false;
  }

  function modalOpen() {
    return !!document.querySelector(".modal-backdrop, .home-return-transition, .language-transition");
  }

  function init(ctx) {
    world.ctx = ctx;
    const THREE = ctx.three;
    const V3 = THREE.Pq0;
    world.tmp = { a: new V3(), b: new V3(), c: new V3(), right: new V3(), up: new V3() };
    world.lamp.center = new V3();
    world.lamp.materials = [];
    ctx.lamp.traverse((obj) => {
      if (!obj.isMesh) return;
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => {
        if (world.lamp.materials.indexOf(m) === -1) world.lamp.materials.push(m);
      });
    });
    const hx = 0.39;
    const hy = 1.025;
    const hz = 0.425;
    world.chimney.corners = [];
    for (let i = 0; i < 8; i += 1) {
      world.chimney.corners.push(new V3(i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz));
    }
    world.chimney.scratch = new V3();
    if (ctx.scene.fog) world.fogBase = { near: ctx.scene.fog.near, far: ctx.scene.fog.far };
    root.classList.add("alx-world-live");
  }

  function introProgress(dt) {
    const intro = world.intro;
    if (intro.state === "waiting") {
      if (!world.shell) world.shell = document.querySelector(".site-shell");
      const ready = world.shell && world.shell.classList.contains("is-world-ready") && world.drawn;
      if (!ready) {
        intro.sawLoading = true;
        return 0;
      }
      if (capture === "hero" || reducedMotion.matches || world.progress > 0.02 || (!intro.sawLoading && capture !== "intro")) {
        intro.state = "done";
        root.classList.add("alx-intro-done");
        return 1;
      }
      intro.state = "running";
      intro.elapsed = 0;
      root.classList.add("alx-intro-running");
      return 0;
    }
    if (intro.state !== "running") return 1;
    // someone scrolled or opened a dialog: land quickly instead of fighting them
    if (capture === "intro") return 0;
    const speed = world.progress > 0.012 || modalOpen() ? 6 : 1;
    intro.elapsed += dt * 1000 * speed;
    const k = clamp01(intro.elapsed / intro.duration);
    if (k >= 1) {
      intro.state = "done";
      root.classList.remove("alx-intro-running");
      root.classList.add("alx-intro-done");
    }
    return k;
  }

  function camera(cam, target, progress, night) {
    if (!world.ctx) return;
    world.progress = progress;
    world.night = night;
    const now = performance.now();
    const dt = Math.min(0.1, (now - world.lastTime) / 1000);
    world.lastTime = now;
    const t = world.tmp;

    // Intro: arc down from high above the hills onto the opening shot.
    const k = introProgress(dt);
    if (k < 1) {
      const e = easeInOutCubic(easeOutQuint(k) * 0.35 + k * 0.65);
      t.a.copy(cam.position).sub(target);
      const r = t.a.length();
      const az = Math.atan2(t.a.x, t.a.z);
      const el = Math.asin(t.a.y / r);
      const r0 = r * 1.85;
      const az0 = az + 0.95;
      const el0 = Math.min(el + 0.62, 1.22);
      const rr = lerp(r0, r, e);
      const aa = lerp(az0, az, e);
      const ee = lerp(el0, el, e);
      cam.position.set(
        target.x + rr * Math.cos(ee) * Math.sin(aa),
        target.y + rr * Math.sin(ee),
        target.z + rr * Math.cos(ee) * Math.cos(aa),
      );
      cam.lookAt(target);
    }

    world.camDist = t.b.copy(cam.position).distanceTo(target);

    // Pointer parallax: a gentle orbit around what the camera is looking at.
    const p = world.pointer;
    const enabled = finePointer.matches && !reducedMotion.matches && !modalOpen();
    const tx = enabled && p.active ? p.x : 0;
    const ty = enabled && p.active ? p.y : 0;
    const follow = 1 - Math.exp(-dt * 2.6);
    p.sx += (tx - p.sx) * follow;
    p.sy += (ty - p.sy) * follow;
    if (Math.abs(p.sx) > 1e-4 || Math.abs(p.sy) > 1e-4) {
      const dist = t.a.copy(cam.position).distanceTo(target);
      const amp = Math.min(0.75, Math.max(0.05, dist * 0.028)) * (k < 1 ? k : 1);
      t.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      t.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      cam.position.addScaledVector(t.right, p.sx * amp).addScaledVector(t.up, -p.sy * amp * 0.55);
      cam.lookAt(target);
    }
  }

  function frame(progress, night) {
    const ctx = world.ctx;
    if (!ctx) return;
    const cam = ctx.camera;

    // The frame hook runs just before each render, so by the 3rd call at least two frames are on screen.
    world.frames += 1;
    if (world.frames === 3 || world.frames === 40 || world.frames === 200) {
      if (checkShaders(ctx)) world.frames = 0;
    }
    if (!world.drawn && world.frames >= 3) {
      world.drawn = true;
      root.classList.add("alx-drawn");
    }

    // Tilt-shift "miniature" focus on the exterior establishing shots.
    const grade = ctx.grade && ctx.grade();
    if (grade && grade.uniforms && grade.uniforms.tilt && !world.noTilt) {
      const running = world.intro.state === "running";
      const exterior = 1 - smooth(0.025, 0.1, progress);
      const returning = smooth(0.962, 0.996, progress);
      let amount = Math.max(exterior, returning);
      if (running) amount = 1.35;
      world.tilt += (amount - world.tilt) * 0.12;
      const size = ctx.renderer.domElement;
      const w = size.clientWidth || window.innerWidth;
      const h = size.clientHeight || window.innerHeight;
      grade.uniforms.texel.value.set(1 / w, 1 / h);
      grade.uniforms.tilt.value = world.tilt * (smallScreen.matches ? 3.2 : 5.2);
      grade.uniforms.focusY.value = smallScreen.matches ? 0.5 : 0.47;
    }

    // Keep the haze tuned for the opening shot; thin it out when the camera climbs high.
    if (world.fogBase && ctx.scene.fog) {
      const extra = Math.max(0, (world.camDist || 0) - 24);
      ctx.scene.fog.near = world.fogBase.near + extra * 0.95;
      ctx.scene.fog.far = world.fogBase.far + extra * 1.25;
    }

    // Fade the pendant lamp whenever the camera brushes past it.
    const lamp = world.lamp;
    if (lamp.materials.length) {
      ctx.lamp.getWorldPosition(lamp.center);
      lamp.center.y += 2.3;
      const d = lamp.center.distanceTo(cam.position);
      const target = smooth(1.3, 2.45, d);
      lamp.fade += (target - lamp.fade) * 0.25;
      const f = lamp.fade > 0.995 ? 1 : lamp.fade;
      lamp.materials.forEach((m) => {
        const wantsTransparent = f < 1;
        if (m.transparent !== wantsTransparent) {
          m.transparent = wantsTransparent;
          m.needsUpdate = true;
        }
        m.opacity = f;
        m.depthWrite = f > 0.6;
      });
      if (ctx.lampHalo) ctx.lampHalo.opacity *= f;
      ctx.lamp.visible = f > 0.02;
    }

    // Project the chimney so it can be hovered / clicked.
    const ch = world.chimney;
    if (ch.corners && ctx.chimney) {
      const outside = progress < 0.2 || progress > 0.93;
      if (!outside || !ctx.chimney.visible) {
        ch.rect = null;
      } else {
        ctx.chimney.updateWorldMatrix(true, false);
        const w = window.innerWidth;
        const h = window.innerHeight;
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        let behind = false;
        ch.corners.forEach((c) => {
          const v = ch.scratch.copy(c).applyMatrix4(ctx.chimney.matrixWorld).project(cam);
          if (v.z > 1) behind = true;
          const sx = (v.x * 0.5 + 0.5) * w;
          const sy = (-v.y * 0.5 + 0.5) * h;
          x0 = Math.min(x0, sx);
          y0 = Math.min(y0, sy);
          x1 = Math.max(x1, sx);
          y1 = Math.max(y1, sy);
        });
        ch.rect = behind ? null : { x0: x0 - 10, y0: y0 - 14, x1: x1 + 10, y1: y1 + 6 };
      }
    }
    if (sound.enabled) sound.update(progress, night);
  }

  window.__alexWorld = {
    init: guard("init", init),
    camera: guard("camera", camera),
    frame: guard("frame", frame),
  };
  if (window.__alexWorldCtx) window.__alexWorld.init(window.__alexWorldCtx);

  /* ?debug=1 shows a live diagnostics panel (for tracking down browser-specific problems) */
  if (/[?&]debug=1\b/.test(window.location.search)) startDebugPanel();
  function startDebugPanel() {
    const errors = [];
    const push = (msg) => errors.length < 12 && errors.push(String(msg).slice(0, 240));
    window.addEventListener("error", (e) => push("error: " + e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno));
    window.addEventListener("unhandledrejection", (e) => push("rejection: " + (e.reason && e.reason.message ? e.reason.message : e.reason)));
    const origError = console.error;
    console.error = function patched() {
      push("console: " + Array.from(arguments).map(String).join(" "));
      return origError.apply(console, arguments);
    };
    let contextLost = 0;
    let lastFrames = 0;
    let fps = 0;
    const panel = document.createElement("pre");
    panel.style.cssText =
      "position:fixed;z-index:2147483647;left:8px;top:8px;max-width:min(560px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;margin:0;padding:10px 12px;font:11px/1.45 ui-monospace,Menlo,monospace;color:#e8f3ec;background:rgba(10,20,16,.88);border-radius:10px;white-space:pre-wrap;pointer-events:auto;user-select:text";
    const render = () => {
      if (!panel.isConnected && document.body) document.body.appendChild(panel);
      const ctx = world.ctx;
      const lines = ["alex-world debug", "ua: " + navigator.userAgent, "dpr: " + window.devicePixelRatio + "  viewport: " + innerWidth + "x" + innerHeight];
      lines.push("classes: " + root.className);
      const shell = document.querySelector(".site-shell");
      lines.push("ready: " + !!(shell && shell.classList.contains("is-world-ready")) + "  fallback: " + !!document.querySelector(".world-fallback") + "  loader hidden: " + !!document.querySelector(".loader.is-hidden"));
      const canvas = document.querySelector(".world-canvas canvas");
      if (canvas) {
        const r = canvas.getBoundingClientRect();
        const cs = getComputedStyle(canvas);
        lines.push("canvas: css " + Math.round(r.width) + "x" + Math.round(r.height) + " buffer " + canvas.width + "x" + canvas.height + " display " + cs.display + " vis " + cs.visibility + " op " + cs.opacity);
      } else lines.push("canvas: none");
      if (ctx) {
        const gl = ctx.renderer.getContext();
        fps = world.frames - lastFrames;
        lastFrames = world.frames;
        const info = ctx.renderer.info;
        lines.push("webgl2: " + (typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext) + "  lost: " + gl.isContextLost() + " (events " + contextLost + ")");
        lines.push("frames: " + world.frames + "  fps~" + fps + "  drawn: " + !!world.drawn + "  intro: " + world.intro.state + "  noTilt: " + !!world.noTilt + "  broken: " + world.broken);
        const composer = ctx.composer && ctx.composer();
        lines.push("composer: " + (composer ? composer.passes.map((p) => p.constructor.name || "pass").join(" > ") : "none (quality low)"));
        lines.push("render: calls " + info.render.calls + " tris " + info.render.triangles + "  textures " + info.memory.textures + "  programs " + info.programs.length);
        info.programs
          .filter((p) => p.diagnostics && p.diagnostics.runnable === false)
          .forEach((p) => lines.push("FAILED program " + p.name + ": " + ((p.diagnostics.fragmentShader && p.diagnostics.fragmentShader.log) || p.diagnostics.programLog || "").slice(0, 300)));
      } else lines.push("3D context: not initialised");
      if (errors.length) lines.push("errors:\n  " + errors.join("\n  "));
      panel.textContent = lines.join("\n");
      if (ctx && !render.hooked) {
        render.hooked = true;
        ctx.renderer.domElement.addEventListener("webglcontextlost", () => (contextLost += 1));
      }
    };
    setInterval(render, 1000);
  }

  // If the world never manages to draw (lost GPU, blocked WebGL), stop holding the poster.
  setTimeout(() => {
    if (!world.drawn) {
      world.drawn = true;
      root.classList.add("alx-drawn");
    }
  }, 15000);

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      world.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      world.pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
      world.pointer.active = true;
      updateChimneyHover(event.clientX, event.clientY);
    },
    { passive: true },
  );
  document.addEventListener("mouseleave", () => {
    world.pointer.active = false;
  });

  /* ------------------------------------------------------------------ */
  /* Chimney easter egg: knock on the real chimney instead of a button   */
  /* ------------------------------------------------------------------ */

  const tip = document.createElement("div");
  tip.className = "alx-chimney-tip";
  tip.setAttribute("aria-hidden", "true");

  function overChimney(x, y) {
    const r = world.chimney.rect;
    return !!r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1 && !modalOpen();
  }

  function isInteractive(el) {
    return !!(el && el.closest && el.closest("button, a, input, textarea, select, [role='dialog'], .alx-menu"));
  }

  function updateChimneyHover(x, y) {
    const hit = overChimney(x, y) && !isInteractive(document.elementFromPoint(x, y));
    root.classList.toggle("alx-over-chimney", hit);
    if (hit) {
      if (!tip.isConnected) document.body.appendChild(tip);
      tip.textContent = copy[lang()].knock;
      tip.style.transform = `translate3d(${x + 16}px, ${y - 30}px, 0)`;
    }
  }

  window.addEventListener("click", (event) => {
    if (!overChimney(event.clientX, event.clientY) || isInteractive(event.target)) return;
    const secret = document.querySelector(".secret-action");
    if (secret) {
      secret.click();
      sound.knock();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Ambient sound (procedural, off by default)                          */
  /* ------------------------------------------------------------------ */

  const sound = {
    enabled: false,
    ctx: null,
    master: null,
    windGain: null,
    nextBird: 0,
    nextCricket: 0,
    start() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      if (!this.ctx) {
        const ac = new AudioContext();
        this.ctx = ac;
        this.master = ac.createGain();
        this.master.gain.value = 0;
        this.master.connect(ac.destination);

        // wind: looped pink-ish noise through a slowly breathing band-pass
        const seconds = 4;
        const buffer = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < data.length; i += 1) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
        }
        // cross-fade the loop seam
        const fade = Math.floor(ac.sampleRate * 0.25);
        for (let i = 0; i < fade; i += 1) {
          const t = i / fade;
          data[i] = data[i] * t + data[data.length - fade + i] * (1 - t);
        }
        const src = ac.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.loopEnd = seconds - 0.25;
        const band = ac.createBiquadFilter();
        band.type = "bandpass";
        band.frequency.value = 520;
        band.Q.value = 0.55;
        const lfo = ac.createOscillator();
        lfo.frequency.value = 0.07;
        const lfoGain = ac.createGain();
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain).connect(band.frequency);
        this.windGain = ac.createGain();
        this.windGain.gain.value = 0.55;
        src.connect(band).connect(this.windGain).connect(this.master);
        src.start();
        lfo.start();
      }
      this.ctx.resume();
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.6);
      this.enabled = true;
      return true;
    },
    stop() {
      if (!this.ctx) return;
      this.enabled = false;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    },
    chirp(when, base) {
      const ac = this.ctx;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      const notes = 2 + Math.floor(Math.random() * 3);
      let t = when;
      gain.gain.setValueAtTime(0, t);
      for (let i = 0; i < notes; i += 1) {
        const f = base * (1 + Math.random() * 0.35);
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * (1.25 + Math.random() * 0.3), t + 0.07);
        gain.gain.linearRampToValueAtTime(0.045, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.11);
        t += 0.13 + Math.random() * 0.06;
      }
      osc.connect(gain).connect(this.master);
      osc.start(when);
      osc.stop(t + 0.05);
    },
    cricket(when) {
      const ac = this.ctx;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.value = 4300 + Math.random() * 500;
      gain.gain.setValueAtTime(0, when);
      for (let i = 0; i < 3; i += 1) {
        const t = when + i * 0.055;
        gain.gain.linearRampToValueAtTime(0.012, t + 0.008);
        gain.gain.linearRampToValueAtTime(0, t + 0.04);
      }
      osc.connect(gain).connect(this.master);
      osc.start(when);
      osc.stop(when + 0.25);
    },
    knock() {
      if (!this.enabled || !this.ctx) return;
      const ac = this.ctx;
      [0, 0.16].forEach((offset) => {
        const t = ac.currentTime + offset;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    },
    update(progress, night) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const indoor = smooth(0.25, 0.3, progress) * (1 - smooth(0.64, 0.68, progress));
      this.windGain.gain.setTargetAtTime(0.55 * (1 - indoor * 0.75), now, 0.4);
      if (night < 0.5) {
        if (now > this.nextBird) {
          if (this.nextBird) this.chirp(now + 0.05, 2600 + Math.random() * 1400);
          this.nextBird = now + 2.5 + Math.random() * 6 + indoor * 6;
        }
      } else if (now > this.nextCricket) {
        if (this.nextCricket) this.cricket(now + 0.02);
        this.nextCricket = now + 0.4 + Math.random() * 1.2;
      }
    },
  };

  /* ------------------------------------------------------------------ */
  /* Top bar: one menu + one sound toggle instead of five pills          */
  /* ------------------------------------------------------------------ */

  const icons = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    soundOff:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="m17 9.5 4 5M21 9.5l-4 5"/></svg>',
    soundOn:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  };

  let menuButton = null;
  let soundButton = null;

  function setMenu(open) {
    root.classList.toggle("alx-menu-open", open);
    if (!menuButton) return;
    const t = copy[lang()];
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    menuButton.setAttribute("aria-label", open ? t.close : t.menu);
    menuButton.innerHTML = open ? icons.close : icons.menu;
  }

  function renderSoundButton() {
    if (!soundButton) return;
    const t = copy[lang()];
    soundButton.innerHTML = sound.enabled ? icons.soundOn : icons.soundOff;
    soundButton.setAttribute("aria-pressed", sound.enabled ? "true" : "false");
    soundButton.setAttribute("aria-label", sound.enabled ? t.soundOff : t.soundOn);
    soundButton.title = sound.enabled ? t.soundOff : t.soundOn;
  }

  function mountTopbar() {
    const topbar = document.querySelector(".topbar");
    const actions = topbar && topbar.querySelector(".top-actions");
    if (!topbar || !actions) return false;
    if (topbar.querySelector(".alx-menu")) return true;

    actions.id = actions.id || "alx-top-actions";
    const wrap = document.createElement("div");
    wrap.className = "alx-menu";

    soundButton = document.createElement("button");
    soundButton.type = "button";
    soundButton.className = "alx-icon-button alx-sound";
    soundButton.addEventListener("click", () => {
      if (sound.enabled) {
        sound.stop();
        storage.set("alex-site-sound", "off");
      } else if (sound.start()) {
        storage.set("alex-site-sound", "on");
      }
      renderSoundButton();
    });

    menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "alx-icon-button alx-menu-toggle";
    menuButton.setAttribute("aria-controls", actions.id);
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setMenu(!root.classList.contains("alx-menu-open"));
    });

    wrap.append(soundButton, menuButton);
    topbar.insertBefore(wrap, actions);
    root.classList.add("alx-ui");
    setMenu(false);
    renderSoundButton();
    return true;
  }

  if (storage.get("alex-site-sound") === "on") {
    const resume = (event) => {
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
      if (event.target.closest && event.target.closest(".alx-sound")) return;
      if (!sound.enabled && sound.start()) renderSoundButton();
    };
    window.addEventListener("pointerdown", resume, true);
    window.addEventListener("keydown", resume, true);
  }

  document.addEventListener("click", (event) => {
    if (!root.classList.contains("alx-menu-open")) return;
    const inside = event.target.closest && event.target.closest(".top-actions, .alx-menu");
    const choseAction = event.target.closest && event.target.closest(".top-actions button");
    if (!inside || choseAction) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("alx-menu-open")) {
      setMenu(false);
      if (menuButton) menuButton.focus();
    }
  });

  // React owns the page; re-attach our controls if it ever re-renders the top bar,
  // and keep labels in the visitor's language.
  const observer = new MutationObserver(() => {
    mountTopbar();
    const current = lang();
    if (current !== observer.lang) {
      observer.lang = current;
      setMenu(root.classList.contains("alx-menu-open"));
      renderSoundButton();
    }
  });
  function start() {
    mountTopbar();
    observer.lang = lang();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-language"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
