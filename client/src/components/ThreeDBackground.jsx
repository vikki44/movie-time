import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeDBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 15;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x180f2b, 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff69b4, 2, 50);
    pointLight.position.set(5, 5, 8);
    scene.add(pointLight);

    const purpleLight = new THREE.PointLight(0xc8a2ff, 1.5, 50);
    purpleLight.position.set(-8, -5, 5);
    scene.add(purpleLight);

    // 5. Create 3D Geometries
    const extrudeSettings = {
      depth: 0.4,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08
    };

    // Heart Shape
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, -0.6);
    heartShape.bezierCurveTo(-0.6, 0.1, -1.2, 0.5, -1.2, 1.2);
    heartShape.bezierCurveTo(-1.2, 1.9, -0.6, 2.5, 0, 1.3);
    heartShape.bezierCurveTo(0.6, 2.5, 1.2, 1.9, 1.2, 1.2);
    heartShape.bezierCurveTo(1.2, 0.5, 0.6, 0.1, 0, -0.6);

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    // Center geometry
    heartGeo.center();

    // Star Shape
    const starShape = new THREE.Shape();
    const starPoints = 5;
    const rOuter = 1.0;
    const rInner = 0.45;
    for (let i = 0; i < 2 * starPoints; i++) {
      const angle = (i * Math.PI) / starPoints - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      starShape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    starShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    starGeo.center();

    // Crescent Moon Shape
    const moonShape = new THREE.Shape();
    moonShape.absarc(0, 0, 2.5, -Math.PI / 2, Math.PI / 2, false);
    moonShape.absarc(0.8, 0, 2.05, Math.PI / 2, -Math.PI / 2, true);
    moonShape.closePath();
    const moonGeo = new THREE.ExtrudeGeometry(moonShape, {
      ...extrudeSettings,
      depth: 0.6
    });
    moonGeo.center();

    // Materials
    const pinkMaterial = new THREE.MeshStandardMaterial({
      color: 0xff69b4,
      emissive: 0x9c1a53,
      emissiveIntensity: 0.15,
      roughness: 0.15,
      metalness: 0.1
    });

    const purpleMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8a2ff,
      emissive: 0x54238c,
      emissiveIntensity: 0.15,
      roughness: 0.15,
      metalness: 0.1
    });

    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe5e9,
      emissive: 0xb388ff,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.05
    });

    // 6. Spawn Floating Elements
    const floatingObjects = [];

    // Giant central moon (offsets slightly to top left)
    const mainMoon = new THREE.Mesh(moonGeo, moonMaterial);
    mainMoon.position.set(-6, 3, -2);
    mainMoon.rotation.set(0.1, 0.4, -0.3);
    scene.add(mainMoon);
    floatingObjects.push({
      mesh: mainMoon,
      rotSpeedX: 0.002,
      rotSpeedY: 0.004,
      rotSpeedZ: 0.001,
      floatSpeed: 0.0006,
      floatRange: 0.6,
      initialY: 3,
      timeOffset: 0
    });

    // Hearts & Stars spawn
    const count = 12;
    for (let i = 0; i < count; i++) {
      const isStar = i % 2 === 0;
      const mesh = new THREE.Mesh(
        isStar ? starGeo : heartGeo,
        isStar ? purpleMaterial : pinkMaterial
      );

      // Distribute in 3D space
      const x = (Math.random() - 0.5) * 26;
      const y = (Math.random() - 0.5) * 16;
      const z = (Math.random() - 0.5) * 10 - 2;
      mesh.position.set(x, y, z);

      // Random scale
      const scale = Math.random() * 0.4 + 0.4;
      mesh.scale.set(scale, scale, scale);

      // Random initial rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      scene.add(mesh);
      floatingObjects.push({
        mesh,
        rotSpeedX: (Math.random() - 0.5) * 0.01,
        rotSpeedY: (Math.random() - 0.5) * 0.01,
        rotSpeedZ: (Math.random() - 0.5) * 0.005,
        floatSpeed: Math.random() * 0.002 + 0.0008,
        floatRange: Math.random() * 0.5 + 0.3,
        initialY: y,
        timeOffset: Math.random() * 100
      });
    }

    // 7. Particle Dust Field
    const particleCount = 180;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = [];

    for (let i = 0; i < particleCount; i++) {
      // Position
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

      // Vertical drift speeds
      particleSpeeds.push(Math.random() * 0.01 + 0.005);
    }

    particlesGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    // Cute glowing dot texture drawn dynamically in 2D canvas
    const createCircleTexture = () => {
      const matCanvas = document.createElement('canvas');
      matCanvas.width = 16;
      matCanvas.height = 16;
      const ctx = matCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(200, 162, 255, 0.6)');
      grad.addColorStop(1, 'rgba(255, 105, 180, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);

      const texture = new THREE.Texture(matCanvas);
      texture.needsUpdate = true;
      return texture;
    };

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.22,
      map: createCircleTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75
    });

    const particleSystem = new THREE.Points(particlesGeo, particleMaterial);
    scene.add(particleSystem);

    // 8. Interactive Mouse Movement
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * -2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 9. Animation Loop
    let animationFrameId;
    let time = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.01;

      // Animate floating stars, hearts, moon
      floatingObjects.forEach((obj) => {
        obj.mesh.rotation.x += obj.rotSpeedX;
        obj.mesh.rotation.y += obj.rotSpeedY;
        obj.mesh.rotation.z += obj.rotSpeedZ;

        // Soft float up and down
        obj.mesh.position.y =
          obj.initialY +
          Math.sin(time * 0.8 + obj.timeOffset) * obj.floatRange;
      });

      // Animate dust particles rising
      const coords = particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        // Update Y position
        coords[i * 3 + 1] += particleSpeeds[i];

        // Reset particle if it drifts too high
        if (coords[i * 3 + 1] > 12) {
          coords[i * 3 + 1] = -12;
          coords[i * 3] = (Math.random() - 0.5) * 35;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      // Mouse Parallax camera easing
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX * 1.5;
      camera.position.y = targetY * 1.5;
      camera.lookAt(scene.position);

      // Make point lights sway with mouse
      pointLight.position.x = 5 + targetX * 4;
      pointLight.position.y = 5 + targetY * 4;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Handle Resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // 11. Cleanup function to prevent GPU leak
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      // Dispose resources
      heartGeo.dispose();
      starGeo.dispose();
      moonGeo.dispose();
      pinkMaterial.dispose();
      purpleMaterial.dispose();
      moonMaterial.dispose();
      particlesGeo.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  );
}
