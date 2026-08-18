import * as THREE from "three";

export function createStander() {
  const root = new THREE.Group();
  root.name = "stander";

  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.32,
    metalness: 0.55,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3ae06a,
    emissive: 0x145c2c,
    emissiveIntensity: 0.85,
    roughness: 0.45,
    metalness: 0.1,
  });
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xf3f6f3,
    roughness: 0.18,
    metalness: 0.05,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0x2db84a,
    emissive: 0x1f8a38,
    emissiveIntensity: 1.1,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), dark);
  body.scale.set(1.02, 0.94, 1.02);
  body.castShadow = true;
  root.add(body);

  const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.46, 28, 28), eyeWhite);
  sclera.position.set(0, 0.14, 0.72);
  sclera.scale.set(1, 1, 0.72);
  root.add(sclera);

  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), irisMat);
  iris.position.set(0.05, 0.16, 0.98);
  root.add(iris);

  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), new THREE.MeshBasicMaterial({ color: 0x051208 }));
  pupil.position.set(0.07, 0.17, 1.2);
  root.add(pupil);

  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  glint.position.set(-0.02, 0.28, 1.28);
  root.add(glint);

  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.78, 10), dark);
  stalk.position.set(-0.18, 1.18, 0.05);
  stalk.rotation.z = 0.46;
  root.add(stalk);

  const blade = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), leafMat);
  blade.scale.set(1.55, 0.32, 0.72);
  blade.position.set(-0.5, 1.52, 0.08);
  blade.rotation.z = -0.55;
  root.add(blade);

  [[-1, 0.55], [1, -0.55]].forEach(([side, rot]) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.32, 4, 8), dark);
    arm.position.set(side * 0.92, -0.12, 0.12);
    arm.rotation.z = rot;
    arm.castShadow = true;
    root.add(arm);
  });
  [-0.34, 0.34].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.22, 4, 8), dark);
    leg.position.set(x, -0.98, 0.08);
    leg.castShadow = true;
    root.add(leg);
  });

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.022, 8, 18, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xd5d5d5 })
  );
  smile.position.set(0, -0.22, 0.88);
  smile.rotation.set(Math.PI, 0, 0);
  root.add(smile);

  const glow = new THREE.PointLight(0x31d66d, 2.2, 10, 2);
  glow.position.set(0, 0.35, 1.1);
  root.add(glow);

  root.userData.blade = blade;
  root.userData.iris = iris;
  root.userData.pupil = pupil;
  root.userData.glow = glow;
  return root;
}

export function animateStander(root, t, mood = "front") {
  if (!root) return;
  const bob = Math.sin(t * 1.6) * 0.07;
  root.position.y = 1.55 + bob;
  root.position.z = 0;
  root.rotation.y = Math.sin(t * 0.55) * 0.22;
  if (root.userData.blade) root.userData.blade.rotation.z = -0.55 + Math.sin(t * 2.4) * 0.14;
  if (root.userData.iris) {
    root.userData.iris.position.x = 0.05 + Math.sin(t * 0.8) * 0.04;
    root.userData.pupil.position.x = 0.07 + Math.sin(t * 0.8) * 0.04;
  }
  root.rotation.x = 0;
  root.rotation.z = 0;
  root.scale.setScalar(1);
  if (mood === "think") {
    root.rotation.z = -0.18;
    root.rotation.x = 0.08;
  } else if (mood === "focus") {
    root.rotation.x = -0.22;
    root.position.z = 0.15;
  } else if (mood === "formal") {
    root.rotation.y += 0.4;
    root.scale.setScalar(1.06);
  } else if (mood === "cozy") {
    root.scale.set(1.08, 0.92, 1.08);
  } else if (mood === "three") {
    root.rotation.y += 0.55;
  }
  if (root.userData.glow) root.userData.glow.intensity = 1.7 + Math.sin(t * 3) * 0.5;
}
