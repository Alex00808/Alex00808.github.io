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

  /* CAMERA_PATH_START */
  // The camera journey as one continuous curve through composed shots.
  // Geometry: centripetal Catmull-Rom through camera positions and look-at targets.
  // Timing: scroll progress -> "perceived distance" travelled, via a monotone cubic through
  // anchors, so moves ease in and out of each stop and keep an even visual pace in between.
  function createCameraPath() {
    // [camera position, look-at target, scroll progress anchor (null = timed by distance)]
    const SHOTS = [
      [[-10.8, 6.6, 18.8], [0, 2.1, 0], 0], // opening shot
      [[-10.25, 6.45, 18.2], [0, 2.08, 0.05], 0.025], // gentle drift while the title is up
      [[-5.385, 5.492, 15.109], [0, 2.014, 0.473], null],
      [[-1.266, 4.191, 11.906], [0, 1.696, 1.951], null],
      [[0, 3.65, 10.8], [0, 1.52, 2.75], null],
      [[2.054, 3.047, 8.729], [0.211, 1.478, 1.483], null],
      [[2.64, 2.71, 7.42], [0.33, 1.455, 0.76], 0.198], // the door swings open
      [[2.713, 2.65, 7.175], [0.35, 1.45, 0.65], 0.228],
      [[1.5, 2.3, 5.55], [0.12, 1.4, -0.25], null],
      [[0.3, 2.0, 3.75], [0, 1.4, -0.55], null], // through the doorway
      [[0.2, 1.9, 1.35], [0, 1.35, -0.65], null],
      [[-2.7, 2.45, 0.8], [-2.15, 1.15, -1.4], 0.352], // sofa: "hi, I'm Alex"
      [[-2.667, 2.372, 0.668], [-2.15, 1.15, -1.4], 0.384],
      [[2.9, 2.75, 0.6], [0, 2.4, -2.72], 0.455], // gallery wall
      [[2.755, 2.733, 0.434], [0, 2.4, -2.72], 0.482],
      [[-2.8, 2.5, -0.1], [2.4, 1.55, -2.3], 0.556], // bookcase
      [[-2.54, 2.453, -0.21], [2.4, 1.55, -2.3], 0.588],
      [[0.15, 2.08, 0.62], [3.7, 1.5, 0.3], null], // turn to the back door
      [[2.45, 1.74, 0.36], [6.4, 1.55, -0.2], 0.646], // door fully open by 0.648
      [[5.2, 1.8, 0.25], [6.7, 1.9, -6.3], 0.674], // outside before the walls return (0.662-0.668)
      [[6.5, 2.3, -3.0], [0.5, 2.35, -11.6], null],
      [[4.6, 1.5, -3.8], [0.3, 2.1, -12.2], 0.728], // dream tree
      [[3.8, 1.18, -4.55], [0, 2.35, -12.5], null],
      [[2.85, 1.35, -5.15], [-0.1, 2.65, -12.4], 0.878],
      [[2.65, 2.0, -4.8], [-0.05, 2.75, -11.8], 0.902], // rise, and fly home over the roof
      [[1.4, 5.8, -3.9], [-0.2, 2.4, -11.4], null],
      [[0.4, 12.5, 2.5], [0, 1.4, -8], null],
      [[-1.8, 13, 9.5], [0, 1.6, -3], null],
      [[-5.8, 10.8, 14.6], [0, 1.9, -1], null],
      [[-9.2, 8.3, 17.8], [0, 2.1, 0], null],
      [[-10.8, 6.6, 18.8], [0, 2.1, 0], 0.995],
    ];
    const n = SHOTS.length;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const len = (a) => Math.hypot(a[0], a[1], a[2]);
    const pt = (list, i) => {
      if (i >= 0 && i < n) return list[i];
      // extrapolate past the ends so the first/last segments keep their direction
      const a = i < 0 ? list[0] : list[n - 1];
      const b = i < 0 ? list[1] : list[n - 2];
      return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
    };
    const positions = SHOTS.map((s) => s[0]);
    const targets = SHOTS.map((s) => s[1]);

    // centripetal Catmull-Rom (Barry-Goldman), segment i -> i+1, local u in [0, 1]
    function catmull(list, i, u, out) {
      const p0 = pt(list, i - 1), p1 = pt(list, i), p2 = pt(list, i + 1), p3 = pt(list, i + 2);
      const t0 = 0;
      const t1 = t0 + Math.pow(Math.max(len(sub(p1, p0)), 1e-4), 0.5);
      const t2 = t1 + Math.pow(Math.max(len(sub(p2, p1)), 1e-4), 0.5);
      const t3 = t2 + Math.pow(Math.max(len(sub(p3, p2)), 1e-4), 0.5);
      const t = t1 + (t2 - t1) * u;
      for (let k = 0; k < 3; k += 1) {
        const a1 = ((t1 - t) * p0[k] + (t - t0) * p1[k]) / (t1 - t0);
        const a2 = ((t2 - t) * p1[k] + (t - t1) * p2[k]) / (t2 - t1);
        const a3 = ((t3 - t) * p2[k] + (t - t2) * p3[k]) / (t3 - t2);
        const b1 = ((t2 - t) * a1 + (t - t0) * a2) / (t2 - t0);
        const b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1);
        out[k] = ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1);
      }
      return out;
    }

    // sample the curve and measure how much the picture changes along it
    const STEPS = 160;
    const uAt = []; // global parameter (segment + local u)
    const sAt = []; // cumulative perceived distance
    const pos = [0, 0, 0], tgt = [0, 0, 0];
    let prevDir = null, prevPos = null, acc = 0;
    for (let i = 0; i < n - 1; i += 1) {
      for (let j = i === 0 ? 0 : 1; j <= STEPS; j += 1) {
        const u = j / STEPS;
        catmull(positions, i, u, pos);
        catmull(targets, i, u, tgt);
        const d = sub(tgt, pos);
        const dist = Math.max(len(d), 0.6);
        const dir = [d[0] / dist, d[1] / dist, d[2] / dist];
        if (prevDir) {
          const dot = dir[0] * prevDir[0] + dir[1] * prevDir[1] + dir[2] * prevDir[2];
          const cross = len([
            dir[1] * prevDir[2] - dir[2] * prevDir[1],
            dir[2] * prevDir[0] - dir[0] * prevDir[2],
            dir[0] * prevDir[1] - dir[1] * prevDir[0],
          ]);
          acc += Math.atan2(cross, dot) + len(sub(pos, prevPos)) / dist + 1e-5;
        }
        prevDir = dir;
        prevPos = pos.slice();
        uAt.push(i + u);
        sAt.push(acc);
      }
    }
    const sOfShot = (i) => sAt[i * STEPS];

    // monotone cubic (Fritsch-Carlson) from scroll progress to perceived distance
    const anchors = [];
    SHOTS.forEach((s, i) => {
      if (s[2] !== null) anchors.push([s[2], sOfShot(i)]);
    });
    anchors.push([1, sOfShot(n - 1)]);
    const m = anchors.length;
    const secant = [];
    for (let i = 0; i < m - 1; i += 1) {
      secant.push((anchors[i + 1][1] - anchors[i][1]) / (anchors[i + 1][0] - anchors[i][0]));
    }
    const slope = anchors.map((_, i) => {
      if (i === 0) return secant[0] * 0.25; // start almost still
      if (i === m - 1) return 0;
      const a = secant[i - 1], b = secant[i];
      if (a <= 0 || b <= 0) return 0;
      const h0 = anchors[i][0] - anchors[i - 1][0], h1 = anchors[i + 1][0] - anchors[i][0];
      const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      return (w1 + w2) / (w1 / a + w2 / b);
    });
    function distanceAt(p) {
      if (p <= anchors[0][0]) return anchors[0][1];
      if (p >= anchors[m - 1][0]) return anchors[m - 1][1];
      let i = 0;
      while (i < m - 2 && p > anchors[i + 1][0]) i += 1;
      const h = anchors[i + 1][0] - anchors[i][0];
      const t = (p - anchors[i][0]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * anchors[i][1] + (t3 - 2 * t2 + t) * h * slope[i] +
        (-2 * t3 + 3 * t2) * anchors[i + 1][1] + (t3 - t2) * h * slope[i + 1];
    }
    function paramAt(s) {
      let lo = 0, hi = sAt.length - 1;
      if (s <= sAt[0]) return uAt[0];
      if (s >= sAt[hi]) return uAt[hi];
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (sAt[mid] < s) lo = mid; else hi = mid;
      }
      const f = (s - sAt[lo]) / Math.max(sAt[hi] - sAt[lo], 1e-9);
      return uAt[lo] + (uAt[hi] - uAt[lo]) * f;
    }
    const smooth = (a, b, v) => {
      const x = Math.max(0, Math.min(1, (v - a) / (b - a)));
      return x * x * x * (x * (6 * x - 15) + 10);
    };
    return {
      shots: SHOTS,
      distanceAt,
      pose(p, small, outPos, outTarget) {
        const g = paramAt(distanceAt(p));
        const i = Math.min(n - 2, Math.floor(g));
        const u = g - i;
        catmull(positions, i, u, outPos);
        catmull(targets, i, u, outTarget);
        if (small) {
          // narrow screens: step a little closer to the dream tree (as the original did)
          const z = smooth(0.69, 0.735, p) * (1 - smooth(0.9, 0.93, p));
          outPos[0] -= 0.15 * z;
          outPos[1] += 0.08 * z;
          outPos[2] -= 0.55 * z;
          outTarget[1] += 0.1 * z;
        }
        return g;
      },
    };
  }
  /* CAMERA_PATH_END */

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
    probe: { nextAt: 12, done: false, steps: 0, lit: null },
    spring: { x: null, v: 0 },
    path: null,
    pathPos: [0, 0, 0],
    pathTarget: [0, 0, 0],
  };

  // Scroll progress glides on a critically damped spring, so wheel notches and flicks become
  // one continuous move instead of steps. Big jumps (restart, Home/End) cut straight there.
  const SPRING = 6.5;
  function progress(raw, dt) {
    const sp = world.spring;
    if (sp.x === null || reducedMotion.matches || capture || Math.abs(raw - sp.x) > 0.3) {
      sp.x = raw;
      sp.v = 0;
      return raw;
    }
    const steps = 4;
    const h = Math.min(dt || 1 / 60, 0.1) / steps;
    for (let i = 0; i < steps; i += 1) {
      sp.v += (SPRING * SPRING * (raw - sp.x) - 2 * SPRING * sp.v) * h;
      sp.x += sp.v * h;
    }
    if (Math.abs(raw - sp.x) < 1e-5 && Math.abs(sp.v) < 1e-4) {
      sp.x = raw;
      sp.v = 0;
    }
    return Math.max(0, Math.min(1, sp.x));
  }

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
    world.path = createCameraPath();
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

    // The journey: one continuous curve through the composed shots (see createCameraPath).
    if (world.path) {
      world.path.pose(progress, smallScreen.matches, world.pathPos, world.pathTarget);
      cam.position.fromArray(world.pathPos);
      target.fromArray(world.pathTarget);
      cam.lookAt(target);
    }

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

    // The frame hook runs just before each render, so by the 3rd call at least two frames were drawn.
    world.frames += 1;
    if (world.frames === 3 || world.frames === 40 || world.frames === 200) {
      if (checkShaders(ctx)) world.frames = 0;
    }
    // only reveal the world once the pixel probe (see after()) confirms something reached the screen
    if (!world.drawn && world.frames >= 3 && world.probe.done) {
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

  // Right after a render, look at what actually reached the screen. Some GPU/browser combinations
  // (seen on Safari 27, Intel Mac) run the post-processing chain without errors yet show nothing;
  // if the picture is empty, step the effects down until it isn't (the plain renderer always works).
  let probeRow = null;
  function after() {
    const ctx = world.ctx;
    const probe = world.probe;
    if (!ctx || probe.done || world.frames < probe.nextAt) return;
    const composer = ctx.composer && ctx.composer();
    if (!composer || !ctx.setQuality) {
      probe.done = true;
      return;
    }
    const gl = ctx.renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    // one read of a single row across the middle of the picture (a GPU readback stalls, so keep it to one)
    if (!probeRow || probeRow.length !== w * 4) probeRow = new Uint8Array(w * 4);
    gl.readPixels(0, Math.floor(h * 0.55), w, 1, gl.RGBA, gl.UNSIGNED_BYTE, probeRow);
    let lit = 0;
    for (let i = 0; i < w; i += 8) {
      const o = i * 4;
      if (probeRow[o] + probeRow[o + 1] + probeRow[o + 2] > 12 && probeRow[o + 3] > 12) lit += 1;
    }
    probe.lit = lit;
    if (lit > 0) {
      probe.done = true;
      return;
    }
    const next = composer.passes.length >= 5 ? 1 : 0;
    probe.steps += 1;
    probe.nextAt = world.frames + 20;
    if (window.console) console.warn("[alex-world] post-processing output is empty on this device; switching to quality " + next);
    ctx.setQuality(next);
    if (next === 0) probe.done = true;
  }

  window.__alexWorld = {
    init: guard("init", init),
    camera: guard("camera", camera),
    frame: guard("frame", frame),
    after: guard("after", after),
    progress(raw, dt) {
      if (world.broken) return raw;
      try {
        return progress(raw, dt);
      } catch (error) {
        reportOnce("progress", error);
        return raw;
      }
    },
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
        lines.push("probe: lit " + world.probe.lit + "  steps " + world.probe.steps + "  done " + world.probe.done);
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
