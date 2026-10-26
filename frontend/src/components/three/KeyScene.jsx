import React, { useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Euler,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// One demo cycle = forge, burn down, burst, short gap. 900s of rental at 45x speed.
const TICKS = 60;
const T_FORGE = 1.4;
const T_BURN = 18.6;
const T_BURST = 1.3;
const T_GAP = 0.9;
const CYCLE = T_FORGE + T_BURN + T_BURST + T_GAP;
const FREEZE_AT = T_FORGE + T_BURN * 0.3;
const RING_R = 2.7;
const PARTICLES = 260;
// Where the key sits across the screen on wide layouts (0.5 = centre).
const KEY_X = 0.7;
const RING_WORLD_D = 5.85; // diameter of the tick ring in world units (it fills ~94% of the view at fitZ)

// Off-white page, forest ticks, black key, lime highlight.
const FOREST = new Color('#123a2c');
const LIME = new Color('#bfe23a');
const BLACK = new Color('#111111');
const ASH = new Color('#d3d5cb');

const { clamp, damp } = MathUtils;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutBack = (t) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(17,17,17,0.5)');
  g.addColorStop(1, 'rgba(17,17,17,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

// The bezel is 60 small boxes merged into one geometry (one draw call).
// Each box keeps its own vertex range so a tick's colour can change on its own.
function buildBezel() {
  const m = new Matrix4();
  const q = new Quaternion();
  const sc = new Vector3();
  const pos = new Vector3();
  const parts = [];
  for (let i = 0; i < TICKS; i++) {
    const a = Math.PI / 2 - (i * Math.PI * 2) / TICKS;
    pos.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0);
    q.setFromEuler(new Euler(0, 0, a - Math.PI / 2));
    sc.set(1, i % 5 === 0 ? 1.8 : 1, 1);
    const g = new BoxGeometry(0.035, 0.2, 0.035);
    g.applyMatrix4(m.compose(pos, q, sc));
    g.setAttribute('color', new BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    parts.push(g);
  }
  const perTick = parts[0].attributes.position.count;
  const geo = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return { geo, perTick };
}

function buildBurst() {
  const base = new Float32Array(PARTICLES * 3);
  const vel = new Float32Array(PARTICLES * 3);
  const col = new Float32Array(PARTICLES * 3);
  const dir = new Vector3();
  const palette = [LIME, BLACK, FOREST, BLACK];
  for (let i = 0; i < PARTICLES; i++) {
    const x = -2.1 + Math.random() * 3.8;
    const y = (Math.random() - 0.5) * 1.1;
    const z = (Math.random() - 0.5) * 0.4;
    base.set([x, y, z], i * 3);
    dir.set(x + 0.3, y * 1.4, z * 2).normalize();
    const sp = 1.2 + Math.random() * 3.2;
    vel.set([dir.x * sp, dir.y * sp + 0.6, dir.z * sp], i * 3);
    const c = palette[Math.floor(Math.random() * palette.length)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(base.slice(), 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  return { base, vel, geo };
}

export default function KeyScene({ store, scroll, reduced }) {
  const host = useRef(null);

  useEffect(() => {
    const el = host.current;
    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = ACESFilmicToneMapping;
    const dom = renderer.domElement;
    dom.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
    el.appendChild(dom);

    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 10.5);

    const pmrem = new PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const light = new DirectionalLight(0xffffff, 1.1);
    light.position.set(3, 4, 5);
    scene.add(light);

    // Materials and geometry
    const body = new MeshStandardMaterial({ color: BLACK, metalness: 0.85, roughness: 0.2 });
    const trim = new MeshStandardMaterial({ color: LIME, metalness: 0.3, roughness: 0.3 });
    const geos = {
      bow: new TorusGeometry(0.62, 0.2, 28, 72),
      shaft: new CylinderGeometry(0.13, 0.13, 2.5, 28),
      collar: new CylinderGeometry(0.2, 0.2, 0.14, 28),
      box: new BoxGeometry(1, 1, 1),
      plane: new PlaneGeometry(1, 1),
      ball: new SphereGeometry(1, 20, 14),
    };
    const bezel = buildBezel();
    const bezelMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const shadowMat = new MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      toneMapped: false,
    });
    const burst = buildBurst();
    const pointsMat = new PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const emberMat = new MeshBasicMaterial({ color: LIME, toneMapped: false });
    const emberRingMat = new MeshBasicMaterial({ color: FOREST, toneMapped: false });

    const shadow = new Mesh(geos.plane, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -2.3;
    scene.add(shadow);

    const ticks = new Mesh(bezel.geo, bezelMat);
    scene.add(ticks);

    // A lime ember rides the burning edge of the ring.
    const ember = new Group();
    const emberCore = new Mesh(geos.ball, emberMat);
    // Flattened so the lime dot sits clearly in front of its forest outline.
    emberCore.scale.set(0.09, 0.09, 0.02);
    emberCore.position.z = 0.03;
    const emberRing = new Mesh(geos.ball, emberRingMat);
    emberRing.scale.set(0.125, 0.125, 0.02);
    ember.add(emberRing, emberCore);
    scene.add(ember);

    const key = new Group();
    const inner = new Group();
    inner.position.x = 0.31;
    const add = (geo, mat, x, y, scale, rotZ) => {
      const m = new Mesh(geo, mat);
      m.position.set(x, y, 0);
      if (scale) m.scale.set(...scale);
      if (rotZ) m.rotation.z = rotZ;
      inner.add(m);
    };
    add(geos.bow, body, -1.45, 0);
    add(geos.shaft, body, 0.35, 0, null, Math.PI / 2);
    add(geos.collar, trim, -0.55, 0, null, Math.PI / 2);
    add(geos.collar, trim, -0.33, 0, null, Math.PI / 2);
    add(geos.box, body, 1.0, -0.39, [0.2, 0.52, 0.16]);
    add(geos.box, body, 1.3, -0.3, [0.2, 0.34, 0.16]);
    add(geos.box, body, 1.56, -0.35, [0.18, 0.44, 0.16]);
    key.add(inner);
    scene.add(key);

    const points = new Points(burst.geo, pointsMat);
    points.visible = false;
    points.frustumCulled = false;
    scene.add(points);

    // Sizing
    const size = { w: 1, h: 1 };
    const resize = () => {
      size.w = el.clientWidth || 1;
      size.h = el.clientHeight || 1;
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      camera.updateProjectionMatrix();
      if (reduced) frame(0);
    };

    // Pointer: the key leans toward the mouse. Dragging spins it freely, with inertia.
    const pointer = { x: 0, y: 0 };
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

    const spinState = { yaw: 0, pitch: 0, vel: 0 };
    let drag = null;
    const onDown = (e) => {
      drag = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      spinState.yaw += dx * 0.01;
      spinState.pitch = clamp(spinState.pitch + dy * 0.006, -0.7, 0.7);
      spinState.vel = dx * 0.006 + spinState.vel * 0.4;
    };
    const onUp = () => {
      drag = null;
      dom.style.cursor = 'grab';
    };
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);

    // Animation
    let time = 0;
    let lastN = -1;
    const fov = MathUtils.degToRad(camera.fov / 2);
    const emberPos = new Vector3();

    function frame(dt) {
      time += dt;
      const t = reduced ? FREEZE_AT : time % CYCLE;
      let phase = 'live';
      let p = 1;
      let forge = 1;
      let b = 0;
      if (t < T_FORGE) {
        phase = 'forge';
        forge = t / T_FORGE;
      } else if (t < T_FORGE + T_BURN) {
        p = 1 - (t - T_FORGE) / T_BURN;
      } else if (t < T_FORGE + T_BURN + T_BURST) {
        phase = 'burst';
        p = 0;
        b = (t - T_FORGE - T_BURN) / T_BURST;
      } else {
        phase = 'gap';
        p = 0;
        b = 1;
      }
      store.current.phase = phase;
      store.current.p = p;

      // Key scale: spring in, hold, shatter out.
      let k = 1;
      if (phase === 'forge') k = Math.max(0.001, easeOutBack(forge));
      if (phase === 'burst') k = 1 - smooth(0, 0.18, b);
      if (phase === 'gap') k = 0.001;

      const s = scroll.current.s;
      if (!drag) {
        spinState.yaw += spinState.vel;
        spinState.vel *= 0.94;
      }
      const spin = phase === 'forge' ? Math.pow(1 - forge, 2) * -Math.PI * 1.3 : 0;
      key.rotation.y = damp(key.rotation.y, pointer.x * 0.45 + s * Math.PI * 1.1 + spin + spinState.yaw, 4, dt);
      key.rotation.x = damp(key.rotation.x, -pointer.y * 0.25 + 0.14 + spinState.pitch, 4, dt);
      key.rotation.z = -0.18 + (reduced ? 0 : Math.sin(time * 0.6) * 0.04);
      key.scale.setScalar(k);
      shadow.scale.set(4.4 * k, 1.3 * k, 1);

      // Camera: the ring fits the viewport; wide screens push the key to the right
      // so the text has room, and scrolling zooms in.
      const aspect = size.w / size.h;
      // Portrait phones: the copy sits in the bottom part of the screen, so the ring is sized
      // to the free space above it (between the nav and the copy) and centred there.
      // Landing3D.css moves the halo and the ghost countdown with the same aspect query (17/20).
      const tall = aspect < 0.85;
      let fitZ = Math.max(11, 6.2 / (2 * Math.tan(fov) * aspect));
      let liftY = 0;
      if (tall) {
        const navPx = 84;
        const copyPx = Math.min(0.54 * size.h, 360);
        const freePx = Math.max(size.h - copyPx - navPx, 150);
        const ringPx = Math.min(size.w * 0.92, freePx * 0.92);
        const visH = (RING_WORLD_D * size.h) / ringPx;               // world height that makes the ring ringPx tall
        fitZ = visH / (2 * Math.tan(fov));
        liftY = -((size.h / 2 - (navPx + freePx / 2)) / size.h) * visH; // camera down = scene up
      }
      const zoom = smooth(0.22, 0.46, s) * (1 - smooth(0.62, 0.84, s));
      camera.position.z = damp(camera.position.z, fitZ * (1 - 0.2 * zoom), 4, dt);
      const visW = 2 * camera.position.z * Math.tan(fov) * aspect;
      const wide = aspect > 1.15;
      camera.position.x = damp(camera.position.x, wide ? -(KEY_X - 0.5) * visW - 0.5 * zoom : 0, 4, dt);
      camera.position.y = damp(camera.position.y, liftY, 4, dt);

      // Bezel: only touch vertex colours when the remaining count changes.
      const n = Math.ceil(p * TICKS);
      if (n !== lastN) {
        lastN = n;
        const col = bezel.geo.attributes.color;
        for (let i = 0; i < TICKS; i++) {
          const c = i >= n ? ASH : FOREST;
          for (let v = i * bezel.perTick; v < (i + 1) * bezel.perTick; v++) col.setXYZ(v, c.r, c.g, c.b);
        }
        col.needsUpdate = true;
      }

      // The ember sits on the last remaining tick while the key is live.
      ember.visible = phase === 'live' && n > 0;
      if (ember.visible) {
        const a = Math.PI / 2 - ((n - 1) * Math.PI * 2) / TICKS;
        emberPos.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0.05);
        ember.position.copy(emberPos);
      }

      // Burst particles.
      points.visible = phase === 'burst';
      if (points.visible) {
        const arr = burst.geo.attributes.position.array;
        const { base, vel } = burst;
        for (let i = 0; i < PARTICLES; i++) {
          const j = i * 3;
          arr[j] = base[j] + vel[j] * b;
          arr[j + 1] = base[j + 1] + vel[j + 1] * b - 1.6 * b * b;
          arr[j + 2] = base[j + 2] + vel[j + 2] * b;
        }
        burst.geo.attributes.position.needsUpdate = true;
        pointsMat.opacity = 1 - smooth(0.45, 1, b);
      }

      renderer.render(scene, camera);
    }

    // Loop runs only while the canvas is on screen.
    let raf = 0;
    let last = 0;
    let onScreen = true;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      frame(dt);
    };
    const sync = () => {
      const want = !reduced && onScreen;
      if (want && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else if (!want && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    resize();
    frame(0);
    sync();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      Object.values(geos).forEach((g) => g.dispose());
      bezel.geo.dispose();
      burst.geo.dispose();
      [body, trim, bezelMat, pointsMat, emberMat, emberRingMat].forEach((m) => m.dispose());
      shadowMat.map.dispose();
      shadowMat.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      dom.remove();
    };
  }, [store, scroll, reduced]);

  return <div ref={host} style={{ width: '100%', height: '100%' }} />;
}
