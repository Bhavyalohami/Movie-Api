import React, { useEffect, useRef } from "react";
import * as THREE from "three";

function CinemaGalaxy() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.55, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);

    const key = new THREE.PointLight(0xffd089, 4, 18);
    key.position.set(4, 5, 5);
    scene.add(key);

    const rim = new THREE.PointLight(0x7ee7ff, 3, 18);
    rim.position.set(-5, -2, 4);
    scene.add(rim);

    const bronze = new THREE.MeshStandardMaterial({
      color: 0xd9a35a,
      metalness: 0.7,
      roughness: 0.24,
      emissive: 0x3a2107,
      emissiveIntensity: 0.22,
    });

    const pearl = new THREE.MeshStandardMaterial({
      color: 0xf9f2df,
      metalness: 0.3,
      roughness: 0.18,
      emissive: 0x203a48,
      emissiveIntensity: 0.18,
    });

    const glass = new THREE.MeshStandardMaterial({
      color: 0x7ee7ff,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.46,
      emissive: 0x194d5c,
      emissiveIntensity: 0.45,
    });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), pearl);
    core.rotation.set(0.4, 0.2, 0.3);
    group.add(core);

    const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.035, 18, 160), bronze);
    ringA.rotation.set(1.18, 0.08, 0.18);
    group.add(ringA);

    const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.025, 18, 180), glass);
    ringB.rotation.set(1.42, 0.55, -0.32);
    group.add(ringB);

    const ringC = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.02, 18, 120), glass);
    ringC.rotation.set(0.42, 1.25, 0.25);
    group.add(ringC);

    const filmMaterial = new THREE.MeshStandardMaterial({
      color: 0x17151d,
      metalness: 0.18,
      roughness: 0.3,
      emissive: 0x120711,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3c76d,
      metalness: 0.4,
      roughness: 0.22,
      emissive: 0x3a2200,
      emissiveIntensity: 0.22,
      side: THREE.DoubleSide,
    });

    const frames = [];
    for (let i = 0; i < 12; i += 1) {
      const pivot = new THREE.Group();
      const angle = (i / 12) * Math.PI * 2;
      pivot.rotation.y = angle;

      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.026), filmMaterial);
      tile.position.set(2.95, Math.sin(angle * 2) * 0.42, 0);
      tile.rotation.y = Math.PI / 2;
      pivot.add(tile);

      const framePane = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.36), frameMaterial);
      framePane.position.set(2.97, tile.position.y, 0.018);
      framePane.rotation.y = Math.PI / 2;
      pivot.add(framePane);

      frames.push(pivot);
      group.add(pivot);
    }

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 160;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 9;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xf8e8bd, size: 0.028, transparent: true, opacity: 0.78 })
    );
    scene.add(stars);

    const resize = () => {
      const width = mount.clientWidth || 600;
      const height = mount.clientHeight || 500;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let rafId = 0;

    const animate = () => {
      frame += 0.01;
      group.rotation.y += 0.004;
      group.rotation.x = Math.sin(frame * 0.8) * 0.06;
      core.rotation.x += 0.006;
      core.rotation.y += 0.008;
      ringA.rotation.z += 0.003;
      ringB.rotation.z -= 0.002;
      ringC.rotation.y += 0.004;
      stars.rotation.y -= 0.0008;
      frames.forEach((pivot, index) => {
        pivot.rotation.y += 0.0025;
        pivot.children[0].position.y = Math.sin(frame * 1.8 + index) * 0.42;
        pivot.children[1].position.y = pivot.children[0].position.y;
      });
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      starGeometry.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="cinema-galaxy" ref={mountRef} aria-hidden="true" />;
}

export default CinemaGalaxy;
