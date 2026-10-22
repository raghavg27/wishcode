"use client";

import { useEffect, useRef } from "react";
import { REDUCED_MOTION } from "@/components/landing/gsap";

const STAR_COUNT = 1800;

const STAR_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aPhase;
  attribute float aWarm;
  varying float vTwinkle;
  varying float vWarm;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vTwinkle = 0.5 + 0.5 * sin(uTime * (0.4 + aPhase * 1.2) + aPhase * 6.2831);
    vWarm = aWarm;
    gl_PointSize = aSize * uPixelRatio * (36.0 / -mv.z);
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  varying float vTwinkle;
  varying float vWarm;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float glow = pow(smoothstep(0.5, 0.0, d), 2.4);
    vec3 cool = vec3(0.87, 0.86, 1.0);
    vec3 gold = vec3(0.957, 0.718, 0.251);
    gl_FragColor = vec4(mix(cool, gold, vWarm), glow * (0.35 + 0.65 * vTwinkle));
  }
`;

const TRAIL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The logo's trail, tail to head: a dot, a short dash, a long dash.
const TRAIL_FRAGMENT = /* glsl */ `
  uniform float uLife;
  varying vec2 vUv;
  void main() {
    float x = vUv.x;
    float dash = step(0.46, x)
      + (step(0.2, x) - step(0.36, x)) * 0.7
      + (step(0.0, x) - step(0.07, x)) * 0.45;
    float edge = 1.0 - smoothstep(0.15, 0.5, abs(vUv.y - 0.5));
    float fade = sin(uLife * 3.14159);
    gl_FragColor = vec4(1.0, 0.85, 0.52, dash * edge * mix(0.3, 1.0, x) * fade);
  }
`;

/**
 * A WebGL starfield that twinkles, leans toward the pointer and now and then
 * sends a shooting star up and to the right, like the logo's. Renders one
 * still frame when motion is reduced, and nothing (the panel's gradient
 * shows) if WebGL is unavailable.
 */
export function NightSky({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (cancelled) return;
      const reduced = window.matchMedia(REDUCED_MOTION).matches;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      } catch {
        return;
      }
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(pixelRatio);
      renderer.domElement.style.display = "block";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

      // Stars in a deep slab in front of the camera; a few are gold.
      const positions = new Float32Array(STAR_COUNT * 3);
      const sizes = new Float32Array(STAR_COUNT);
      const phases = new Float32Array(STAR_COUNT);
      const warmth = new Float32Array(STAR_COUNT);
      for (let i = 0; i < STAR_COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 140;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 90;
        positions[i * 3 + 2] = -5 - Math.random() * 95;
        sizes[i] = Math.random() < 0.04 ? 5 + Math.random() * 4 : 1.5 + Math.random() * 2.5;
        phases[i] = Math.random();
        warmth[i] = Math.random() < 0.12 ? 0.6 + Math.random() * 0.4 : 0;
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      starGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      starGeometry.setAttribute("aWarm", new THREE.BufferAttribute(warmth, 1));
      const starMaterial = new THREE.ShaderMaterial({
        vertexShader: STAR_VERTEX,
        fragmentShader: STAR_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // One reusable shooting star.
      const trailMaterial = new THREE.ShaderMaterial({
        vertexShader: TRAIL_VERTEX,
        fragmentShader: TRAIL_FRAGMENT,
        uniforms: { uLife: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const trailGeometry = new THREE.PlaneGeometry(1, 1);
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.rotation.z = Math.PI / 4;
      trail.visible = false;
      scene.add(trail);
      const shot = { start: new THREE.Vector3(), age: 0, duration: 1.1, distance: 26, nextIn: 2.5 };
      const direction = new THREE.Vector3(1, 1, 0).normalize();

      function launch() {
        const halfHeight = Math.tan(THREE.MathUtils.degToRad(30)) * 30;
        const halfWidth = halfHeight * camera.aspect;
        shot.start.set(
          THREE.MathUtils.randFloat(-halfWidth, halfWidth * 0.3),
          THREE.MathUtils.randFloat(-halfHeight, halfHeight * 0.2),
          -30,
        );
        shot.age = 0;
        shot.duration = THREE.MathUtils.randFloat(0.9, 1.4);
        shot.distance = THREE.MathUtils.randFloat(18, 30);
        trail.scale.set(THREE.MathUtils.randFloat(5, 8), 0.12, 1);
        trail.visible = true;
      }

      function resize() {
        const { clientWidth: w, clientHeight: h } = host!;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = `${w}px`;
        renderer.domElement.style.height = `${h}px`;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();

      const pointer = { x: 0, y: 0 };
      function onPointer(e: PointerEvent) {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      }

      let visible = true;
      let frame = 0;
      let last = performance.now();
      let elapsed = 0;

      function render(now: number) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;
        starMaterial.uniforms.uTime.value = elapsed;

        // Ease toward the pointer and drift up a little as the page scrolls.
        stars.rotation.y += (pointer.x * 0.05 - stars.rotation.y) * 0.04;
        stars.rotation.x += (pointer.y * 0.035 - stars.rotation.x) * 0.04;
        stars.rotation.z += dt * 0.004;
        camera.position.y = -window.scrollY * 0.012;

        if (trail.visible) {
          shot.age += dt;
          const t = shot.age / shot.duration;
          trailMaterial.uniforms.uLife.value = Math.min(t, 1);
          trail.position.copy(shot.start).addScaledVector(direction, shot.distance * (1 - (1 - t) ** 2));
          trail.position.y += camera.position.y;
          if (t >= 1) {
            trail.visible = false;
            shot.nextIn = THREE.MathUtils.randFloat(3.5, 8);
          }
        } else if ((shot.nextIn -= dt) <= 0) {
          launch();
        }

        renderer.render(scene, camera);
        frame = visible ? requestAnimationFrame(render) : 0;
      }

      function start() {
        if (reduced || frame) return;
        last = performance.now();
        frame = requestAnimationFrame(render);
      }
      function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
      }

      const sizeObserver = new ResizeObserver(() => {
        resize();
        if (reduced) renderer.render(scene, camera);
      });
      sizeObserver.observe(host);

      // Only animate while the sky is on screen and the tab is visible.
      const viewObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && !document.hidden;
        if (visible) start();
        else stop();
      });
      viewObserver.observe(host);
      function onVisibility() {
        visible = !document.hidden;
        if (visible) start();
        else stop();
      }

      if (reduced) {
        renderer.render(scene, camera);
      } else {
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        start();
      }

      cleanup = () => {
        stop();
        sizeObserver.disconnect();
        viewObserver.disconnect();
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVisibility);
        starGeometry.dispose();
        starMaterial.dispose();
        trailGeometry.dispose();
        trailMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}
