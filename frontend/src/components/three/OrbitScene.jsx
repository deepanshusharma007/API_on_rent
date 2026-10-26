import React, { useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// One orbit per rental duration. Longer rental = wider, slower, bigger planet.
const ORBITS = [
  { r: 1.7, size: 0.17, speed: 0.9, phase: 0.6, label: '15 MIN' },
  { r: 2.6, size: 0.21, speed: 0.55, phase: 2.4, label: '30 MIN' },
  { r: 3.6, size: 0.27, speed: 0.33, phase: 4.3, label: '1 HR' },
  { r: 4.7, size: 0.34, speed: 0.14, phase: 1.2, label: '24 HR' },
];

const { clamp } = MathUtils;
const PITCH_MIN = 0.25;
const PITCH_MAX = 1.45;

export default function OrbitScene({ selected, onSelect, colors, reduced }) {
  const host = useRef(null);
  const live = useRef({ selected, colors, onSelect });
  const api = useRef(null);

  // Keep the latest props available to the scene's event handlers without re-creating the scene
  useEffect(() => {
    live.current = { selected, colors, onSelect };
  }, [selected, colors, onSelect]);

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
    camera.position.set(0, 0, 17);

    const pmrem = new PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const light = new DirectionalLight(0xffffff, 0.9);
    light.position.set(3, 5, 6);
    scene.add(light);

    // tilt (drag up/down) > spin (drag left/right, plus slow idle turn)
    const tilt = new Group();
    const spin = new Group();
    tilt.rotation.x = 0.95;
    spin.rotation.y = 0.5;
    tilt.add(spin);
    scene.add(tilt);

    const sphere = new SphereGeometry(1, 40, 28);
    const centerMat = new MeshStandardMaterial({ roughness: 0.32, metalness: 0.15 });
    const center = new Mesh(sphere, centerMat);
    center.scale.setScalar(0.85);
    spin.add(center);

    const disposables = [sphere, centerMat];
    const planets = [];
    const labels = [];
    const hits = [];

    ORBITS.forEach((o, i) => {
      const thin = new TorusGeometry(o.r, 0.012, 8, 180);
      const thick = new TorusGeometry(o.r, 0.04, 10, 180);
      const lineMat = new MeshBasicMaterial({ transparent: true, toneMapped: false });
      const thickMat = new MeshBasicMaterial({ transparent: true, opacity: 0.35, toneMapped: false });
      const thinMesh = new Mesh(thin, lineMat);
      const thickMesh = new Mesh(thick, thickMat);
      [thinMesh, thickMesh].forEach((m) => {
        m.rotation.x = Math.PI / 2;
        spin.add(m);
      });

      const pivot = new Group();
      pivot.rotation.y = o.phase;
      const planetMat = new MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
      const planet = new Mesh(sphere, planetMat);
      planet.scale.setScalar(o.size);
      planet.position.x = o.r;
      const hit = new Mesh(sphere, new MeshBasicMaterial());
      hit.scale.setScalar(2.6);
      hit.visible = false;
      hit.userData.i = i;
      planet.add(hit);
      pivot.add(planet);
      spin.add(pivot);

      const label = document.createElement('div');
      label.className = 'orb-label';
      label.textContent = o.label;
      el.appendChild(label);

      disposables.push(thin, thick, lineMat, thickMat, planetMat, hit.material);
      planets.push({ pivot, planet, planetMat, lineMat, thickMat, thickMesh });
      labels.push(label);
      hits.push(hit);
    });

    const centerLabel = document.createElement('div');
    centerLabel.className = 'orb-label orb-label-center';
    centerLabel.textContent = 'API';
    el.appendChild(centerLabel);

    // Colours and selection state, re-applied whenever the page changes them.
    const apply = () => {
      const { selected: sel, colors: c } = live.current;
      centerMat.color.set(c.center);
      planets.forEach((p, i) => {
        const on = i === sel;
        p.planetMat.color.set(on ? c.accent : c.planet);
        p.lineMat.color.set(on ? c.accent : c.line);
        p.lineMat.opacity = on ? 1 : c.lineOpacity;
        p.thickMat.color.set(c.accent);
        p.thickMesh.visible = on;
        labels[i].classList.toggle('is-sel', on);
      });
    };
    api.current = { apply };
    apply();

    // Sizing
    const size = { w: 1, h: 1 };
    const fovHalf = MathUtils.degToRad(camera.fov / 2);
    const resize = () => {
      size.w = el.clientWidth || 1;
      size.h = el.clientHeight || 1;
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      camera.updateProjectionMatrix();
      // Keep the widest orbit inside the panel in both directions.
      camera.position.z = 6.4 / (Math.tan(fovHalf) * Math.min(1, camera.aspect));
    };

    // Drag to spin and tilt, with inertia. A tap (tiny movement) picks a planet.
    const ray = new Raycaster();
    const ndc = new Vector2();
    const pick = (e) => {
      const r = dom.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(hits, false)[0];
      return hit ? hit.object.userData.i : -1;
    };
    let drag = null;
    const vel = { yaw: 0, pitch: 0 };
    let hoverPending = false;

    const onDown = (e) => {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (drag) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        spin.rotation.y += dx * 0.008;
        tilt.rotation.x = clamp(tilt.rotation.x + dy * 0.006, PITCH_MIN, PITCH_MAX);
        vel.yaw = dx * 0.0048 + vel.yaw * 0.4;
        return;
      }
      if (hoverPending) return;
      hoverPending = true;
      const { clientX, clientY } = e;
      requestAnimationFrame(() => {
        hoverPending = false;
        dom.style.cursor = pick({ clientX, clientY }) >= 0 ? 'pointer' : 'grab';
      });
    };
    const onUp = (e) => {
      if (!drag) return;
      if (drag.moved < 6) {
        const i = pick(e);
        if (i >= 0) live.current.onSelect(i);
      }
      drag = null;
      dom.style.cursor = 'grab';
    };
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);

    // Frame
    const v = new Vector3();
    const place = (node, x, y, offset) => {
      node.style.transform = `translate(${x}px,${y}px) ${offset}`;
    };
    let time = 0;
    const frame = (dt) => {
      time += dt;
      if (!reduced) {
        planets.forEach((p, i) => {
          p.pivot.rotation.y = ORBITS[i].phase + time * ORBITS[i].speed;
        });
        if (!drag) {
          spin.rotation.y += vel.yaw + dt * 0.05;
          vel.yaw *= 0.93;
        }
      }
      scene.updateMatrixWorld();
      planets.forEach((p, i) => {
        p.planet.getWorldPosition(v).project(camera);
        place(labels[i], (v.x * 0.5 + 0.5) * size.w, (-v.y * 0.5 + 0.5) * size.h, `translate(${14 + ORBITS[i].size * 30}px,-135%)`);
      });
      center.getWorldPosition(v).project(camera);
      place(centerLabel, (v.x * 0.5 + 0.5) * size.w, (-v.y * 0.5 + 0.5) * size.h, 'translate(-50%,-50%)');
      renderer.render(scene, camera);
    };

    // Loop runs only while the panel is on screen.
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
      if (onScreen && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else if (!onScreen && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const ro = new ResizeObserver(() => {
      resize();
      frame(0);
    });
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
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      disposables.forEach((d) => d.dispose());
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      dom.remove();
      labels.forEach((l) => l.remove());
      centerLabel.remove();
      api.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    api.current?.apply();
  }, [selected, colors]);

  return <div ref={host} className="orb-host" />;
}
