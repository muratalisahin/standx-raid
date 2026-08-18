import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { animateStander, createStander } from "../lib/stander3d.js";

function labelTexture(title, sub, hot) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 256, 128);
  g.fillStyle = hot ? "rgba(8,28,16,0.95)" : "rgba(4,10,7,0.92)";
  g.beginPath();
  if (g.roundRect) g.roundRect(6, 18, 244, 92, 10);
  else g.rect(6, 18, 244, 92);
  g.fill();
  g.strokeStyle = hot ? "#31d66d" : "#3d6a4c";
  g.lineWidth = 4;
  g.stroke();
  g.font = "700 40px IBM Plex Sans, Segoe UI, sans-serif";
  g.fillStyle = "#f4faf6";
  g.textAlign = "center";
  g.fillText(title, 128, 64);
  g.font = "600 22px IBM Plex Sans, Segoe UI, sans-serif";
  g.fillStyle = hot ? "#7dff9a" : "#d5e4d9";
  g.fillText(sub, 128, 92);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function pipeCurve(from, to) {
  const mid = from.clone().lerp(to, 0.5);
  mid.y += from.distanceTo(to) * 0.28 + 0.6;
  const side = new THREE.Vector3().subVectors(to, from).cross(new THREE.Vector3(0, 1, 0)).normalize();
  mid.addScaledVector(side, from.distanceTo(to) * 0.08);
  return new THREE.QuadraticBezierCurve3(from, mid, to);
}

export default function Arena3D({ layout, selected, onSelect, ticks, sip, raid, raidView, imbalance }) {
  const hostRef = useRef(null);
  const world = useRef({});
  const propsRef = useRef({ layout, selected, onSelect, ticks, sip, raid, raidView, imbalance });
  propsRef.current = { layout, selected, onSelect, ticks, sip, raid, raidView, imbalance };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050806);
    scene.fog = new THREE.FogExp2(0x050806, 0.028);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
    camera.position.set(0, 9.2, 16.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.5, 0.42);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 28;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 1.2, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;

    scene.add(new THREE.AmbientLight(0x6a8f74, 0.35));
    const key = new THREE.DirectionalLight(0xe8ffe8, 1.15);
    key.position.set(6, 14, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x31d66d, 0.85);
    rim.position.set(-8, 4, -6);
    scene.add(rim);
    const coreLight = new THREE.PointLight(0x31d66d, 8, 22, 2);
    coreLight.position.set(0, 2.2, 0);
    scene.add(coreLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(28, 64),
      new THREE.MeshStandardMaterial({ color: 0x070b08, metalness: 0.82, roughness: 0.28 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(36, 36, 0x163322, 0x0c1810);
    grid.position.y = 0.01;
    scene.add(grid);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(8.6, 0.045, 12, 128),
      new THREE.MeshStandardMaterial({ color: 0x1c3a28, emissive: 0x0d4a28, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;
    scene.add(ring);

    const ring2 = ring.clone();
    ring2.scale.set(1.18, 1.18, 1.18);
    ring2.material = ring.material.clone();
    ring2.material.emissiveIntensity = 0.35;
    ring2.position.y = 0.12;
    scene.add(ring2);

    const coreGroup = new THREE.Group();
    coreGroup.name = "core";
    const well = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.08, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x31d66d, emissive: 0x31d66d, emissiveIntensity: 1.4, metalness: 0.5, roughness: 0.2 })
    );
    well.rotation.x = Math.PI / 2;
    well.position.y = 0.4;
    coreGroup.add(well);
    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 1),
      new THREE.MeshStandardMaterial({
        color: 0x102418,
        emissive: 0x1a5a32,
        emissiveIntensity: 0.9,
        metalness: 0.7,
        roughness: 0.25,
        wireframe: true,
      })
    );
    nucleus.position.y = 0.9;
    coreGroup.add(nucleus);
    const stander = createStander();
    stander.scale.setScalar(0.72);
    coreGroup.add(stander);
    coreGroup.userData.pick = { kind: "core" };
    scene.add(coreGroup);

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = Math.random() * 28 + 2;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xa8e0b8, size: 0.045, transparent: true, opacity: 0.65 })));

    const modules = new THREE.Group();
    scene.add(modules);
    const pipes = new THREE.Group();
    scene.add(pipes);
    const sparks = new THREE.Group();
    scene.add(sparks);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    let shake = 0;
    let bloomKick = 0;
    let lastFlash = "";

    const onClick = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([coreGroup, modules], true);
      if (!hits.length) return;
      let obj = hits[0].object;
      while (obj && !obj.userData.pick) obj = obj.parent;
      const pick = obj?.userData.pick;
      if (!pick) return;
      propsRef.current.onSelect?.(pick.kind === "core" ? null : pick.symbol);
    };
    renderer.domElement.addEventListener("pointerdown", onClick);

    function fit() {
      const w = Math.max(2, Math.floor(host.clientWidth));
      const h = Math.max(2, Math.floor(host.clientHeight));
      if (w === camera.userData.w && h === camera.userData.h) return;
      camera.userData.w = w;
      camera.userData.h = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.setSize(w, h);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    const bySym = new Map();

    function syncLayout(layout) {
      if (!layout?.nodes) return;
      const S = 8.6 / (layout.ringR || 200);
      const seen = new Set();
      for (const node of layout.nodes) {
        seen.add(node.symbol);
        let rec = bySym.get(node.symbol);
        const x = (node.x - layout.cx) * S;
        const z = (node.y - layout.cy) * S;
        const y = 0.55 + Math.min(1.6, node.r * 0.04);
        if (!rec) {
          const g = new THREE.Group();
          const mat = new THREE.MeshStandardMaterial({
            color: 0x101a14,
            emissive: 0x0c3a20,
            emissiveIntensity: 0.45,
            metalness: 0.62,
            roughness: 0.28,
          });
          const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.42, 6), mat);
          puck.castShadow = true;
          puck.receiveShadow = true;
          const halo = new THREE.Mesh(
            new THREE.TorusGeometry(0.92, 0.035, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0x31d66d, transparent: true, opacity: 0.35 })
          );
          halo.rotation.x = Math.PI / 2;
          halo.position.y = 0.05;
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(node.base, "—", false), transparent: true }));
          sprite.position.y = 1.15;
          sprite.scale.set(2.8, 1.4, 1);
          g.add(puck, halo, sprite);
          g.userData.pick = { kind: "mod", symbol: node.symbol };
          puck.userData.pick = g.userData.pick;
          halo.userData.pick = g.userData.pick;
          modules.add(g);
          rec = { g, puck, halo, sprite, mat, lastTex: "" };
          bySym.set(node.symbol, rec);
        }
        rec.target = new THREE.Vector3(x, y, z);
        rec.node = node;
        rec.g.scale.setScalar(0.85 + Math.min(0.55, node.r / 28));
      }
      for (const [sym, rec] of bySym) {
        if (!seen.has(sym)) {
          modules.remove(rec.g);
          bySym.delete(sym);
        }
      }

      while (pipes.children.length) {
        const m = pipes.children.pop();
        m.geometry?.dispose();
        m.material?.dispose();
      }
      while (sparks.children.length) {
        const m = sparks.children.pop();
        m.geometry?.dispose();
      }

      const sparkMat = new THREE.PointsMaterial({
        color: 0x7dff9a,
        size: 0.11,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      for (const node of layout.nodes) {
        const rec = bySym.get(node.symbol);
        if (!rec?.target) continue;
        const from = new THREE.Vector3(0, 1.05, 0);
        const to = rec.target.clone();
        to.y += 0.1;
        const curve = pipeCurve(from, to);
        rec.curve = curve;
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 32, 0.035 + node.pipe.width * 0.012, 8, false),
          new THREE.MeshStandardMaterial({
            color: 0x163a26,
            emissive: 0x31d66d,
            emissiveIntensity: 0.35,
            metalness: 0.4,
            roughness: 0.3,
            transparent: true,
            opacity: 0.92,
          })
        );
        tube.userData.symbol = node.symbol;
        pipes.add(tube);
        const count = 10;
        const arr = new Float32Array(count * 3);
        const pts = new THREE.BufferGeometry();
        pts.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        const cloud = new THREE.Points(pts, sparkMat);
        cloud.userData = { curve, t0: Math.random(), count, arr, pts };
        sparks.add(cloud);
      }
    }

    let raf = 0;
    const loop = () => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      const p = propsRef.current;
      const view = p.raidView?.current || {};
      controls.autoRotateSpeed = p.raid && view.running ? 1.15 : 0.45;

      const sel = p.selected;
      for (const [sym, rec] of bySym) {
        if (rec.target) rec.g.position.lerp(rec.target, 0.12);
        const hot = sel === sym;
        rec.mat.emissiveIntensity = hot ? 1.35 : 0.4 + Math.abs(rec.node?.funding || 0) * 400;
        rec.halo.material.opacity = hot ? 0.9 : 0.22;
        rec.halo.scale.setScalar(1 + Math.sin(t * (2 + Math.abs(rec.node?.funding || 0) * 80)) * 0.06);
        rec.puck.material.color.set(hot ? 0x163820 : 0x101a14);
        const tick = p.ticks?.[sym] || 0;
        if (tick > 0) rec.mat.emissive.set(0x31d66d);
        else if (tick < 0) rec.mat.emissive.set(0xd34d55);
        else rec.mat.emissive.set(0x0c3a20);
        const sub = rec.node ? `${rec.node.change >= 0 ? "+" : ""}${(rec.node.change || 0).toFixed(2)}%` : "";
        const key = `${sym}|${hot}|${sub}`;
        if (key !== rec.lastTex) {
          rec.sprite.material.map?.dispose();
          rec.sprite.material.map = labelTexture(rec.node.base, sub, hot);
          rec.sprite.material.needsUpdate = true;
          rec.lastTex = key;
        }
      }

      for (const tube of pipes.children) {
        const on = tube.userData.symbol === sel;
        tube.material.emissiveIntensity = on ? 1.4 : 0.28;
        if (p.sip === "SIP-3") tube.material.emissiveIntensity += 0.5;
      }

      for (const cloud of sparks.children) {
        const { curve, count, arr, pts } = cloud.userData;
        cloud.userData.t0 += dt * 0.22;
        for (let i = 0; i < count; i++) {
          const u = (cloud.userData.t0 + i / count) % 1;
          const pt = curve.getPoint(u);
          arr[i * 3] = pt.x;
          arr[i * 3 + 1] = pt.y;
          arr[i * 3 + 2] = pt.z;
        }
        pts.attributes.position.needsUpdate = true;
      }

      nucleus.rotation.y = t * 0.35;
      nucleus.rotation.x = t * 0.12;
      well.scale.setScalar(1 + Math.sin(t * 2.2) * 0.04);
      coreLight.intensity = 6.5 + Math.sin(t * 2.8) * 1.8;
      animateStander(stander, t, view.pose || (p.raid ? "focus" : "front"));

      const flash = view.flash || "";
      if (flash && flash !== lastFlash) {
        if (flash.includes("WRONG") || flash.includes("TIMEOUT")) shake = 0.55;
        if (flash.includes("LOCKED") || flash.includes("STEP")) bloomKick = 0.9;
      }
      lastFlash = flash;
      shake *= 0.86;
      bloomKick *= 0.94;
      bloom.strength = 0.62 + bloomKick * 1.4 + (view.kind?.includes("BOSS") ? 0.25 : 0);
      if (shake > 0.02) {
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake * 0.5;
      }

      if (typeof p.imbalance === "number") {
        well.material.color.set(p.imbalance >= 0 ? 0x31d66d : 0xd34d55);
      }

      controls.update();
      composer.render();
      raf = requestAnimationFrame(loop);
    };

    // rebuild pipes when symbol set changes
    let layoutKey = "";
    const tickLayout = () => {
      const L = propsRef.current.layout;
      const key = L?.nodes?.map((n) => n.symbol).join("|") || "";
      if (key && (key !== layoutKey || !bySym.size)) {
        layoutKey = key;
        syncLayout(L);
      } else if (L?.nodes) {
        const S = 8.6 / (L.ringR || 200);
        for (const node of L.nodes) {
          const rec = bySym.get(node.symbol);
          if (!rec) continue;
          rec.node = node;
          rec.target = new THREE.Vector3((node.x - L.cx) * S, 0.55 + Math.min(1.6, node.r * 0.04), (node.y - L.cy) * S);
          rec.g.scale.setScalar(0.85 + Math.min(0.55, node.r / 28));
        }
      }
    };
    const id = setInterval(tickLayout, 400);
    tickLayout();
    raf = requestAnimationFrame(loop);

    world.current = { renderer, scene };
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onClick);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="arena3d" ref={hostRef} />;
}
