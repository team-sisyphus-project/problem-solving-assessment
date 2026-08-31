/*
 * GlassAsterisk — the glossy glass 3D object at the center of the welcome intro (WebGL)
 * ---------------------------------------------------------------------------
 * Spec: Welcome intro — impact 3D version (option A)
 *
 * A transplant of the approved motion asset (a six-armed star made of 3
 * capsules rotated 60° apart + MeshPhysicalMaterial transmissive glass) into
 * this screen. To match the impression of the reference video the backdrop
 * must live **inside** the scene — the glass has to refract the sky and
 * clouds. So a canvas painted by the `skyPainter` painter is attached to
 * `scene.background`, and repainted whenever the aspect ratio changes.
 *
 * The object sits **behind** the copy (the same overlapping composition as
 * the reference video). Its size is set as a ratio of the viewport so that it
 * never swallows the copy on any screen.
 *
 * The "new library introduction" this spec presupposes is three. To keep it
 * off the initial bundle, it is loaded via dynamic import only at the moment
 * it is needed — the four flow-step screens never load three at all.
 *
 * Color values are not hardcoded. The welcome hero token candidates from
 * tokens.css are read via getComputedStyle and injected into the scene, and
 * if even one token is empty the render is abandoned in favor of the static
 * fallback (onUnavailable) — a mechanism keeping raw values out of this file.
 *
 * Conversely, the material's physical parameters (transmission, ior,
 * thickness, etc.) and the camera/light coordinates are implementation
 * settings whose changes users cannot perceive as color or spacing, so they
 * stay literals (an explicit exception to ui-conventions rule 1). These
 * numbers were carried over verbatim from the approved motion asset and are
 * not to be tweaked arbitrarily.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { paintSky, readSkyPalette } from "./skyPainter";

/** Entrance motion duration (ms) — a one-shot intro of rising and settling into place */
const INTRO_DURATION = 1200;

/** The object's circumscribed diameter (world units) — capsule length 3.4 + end radius 0.44*2 */
const OBJECT_DIAMETER = 4.28;

/**
 * Object size relative to the screen — fit to whichever of height/width is
 * tighter. Follows the reference video's ratio (a bit over half the hero
 * height), but sized one notch smaller so it never covers the copy and hurts
 * readability.
 */
const SIZE_BY_HEIGHT = 0.46;
const SIZE_BY_WIDTH = 0.72;

/** Vertical position of the object's center (relative to screen height) — slightly above dead center */
const CENTER_Y = 0.48;

/** Backdrop texture resolution (fixed width; height follows the screen ratio) — implementation setting */
const SKY_TEXTURE_WIDTH = 768;

interface GlassAsteriskProps {
  /** Signals that WebGL/tokens are unusable and the static fallback must take over */
  onUnavailable: () => void;
}

export function GlassAsterisk({ onUnavailable }: GlassAsteriskProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  // onUnavailable may be a new function on every render, so pin it with a ref
  // — putting it in the dependency list would recreate the whole scene.
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let teardown: (() => void) | null = null;

    void (async () => {
      try {
        const THREE = await import("three");
        const { RoomEnvironment } = await import(
          "three/examples/jsm/environments/RoomEnvironment.js"
        );
        if (disposed) return;

        // ── Token injection ─────────────────────────────────────────────
        // All colors are read from tokens.css. If empty, throw → static fallback.
        const palette = readSkyPalette();
        const rootStyle = getComputedStyle(document.documentElement);
        const token = (name: string): string => {
          const value = rootStyle.getPropertyValue(name).trim();
          if (!value) throw new Error(`Missing hero token: ${name}`);
          return value;
        };
        const objectTint = token("--hero-object-tint");
        const objectAttenuation = token("--hero-object-attenuation");

        // ── Renderer ────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;
        renderer.domElement.setAttribute("aria-hidden", "true");
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 0, 9);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
        scene.environment = environment.texture;

        // ── Sky backdrop (refraction target) ────────────────────────────
        // Painted with the same painter as the DOM's SkyBackdrop, so the two paths never diverge.
        const skyCanvas = document.createElement("canvas");
        const skyContext = skyCanvas.getContext("2d");
        if (!skyContext) {
          throw new Error("Could not create the sky backdrop canvas.");
        }
        const skyTexture = new THREE.CanvasTexture(skyCanvas);
        skyTexture.colorSpace = THREE.SRGBColorSpace;
        scene.background = skyTexture;

        function paintBackdrop(aspect: number) {
          const width = SKY_TEXTURE_WIDTH;
          const height = Math.max(1, Math.round(width / aspect));
          skyCanvas.width = width;
          skyCanvas.height = height;
          paintSky(skyContext!, width, height, palette, "hero");
          skyTexture.needsUpdate = true;
        }

        // ── Glass material + six-armed star ─────────────────────────────
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(objectTint),
          transmission: 1.0,
          thickness: 2.4,
          roughness: 0.32,
          metalness: 0.0,
          ior: 1.4,
          clearcoat: 1.0,
          clearcoatRoughness: 0.12,
          iridescence: 0.65,
          iridescenceIOR: 1.32,
          attenuationColor: new THREE.Color(objectAttenuation),
          attenuationDistance: 6.0,
          envMapIntensity: 1.35,
          transparent: true,
          side: THREE.DoubleSide,
        });

        const asterisk = new THREE.Group();
        const armGeometry = new THREE.CapsuleGeometry(0.44, 3.4, 16, 48);
        for (let i = 0; i < 3; i += 1) {
          const arm = new THREE.Mesh(armGeometry, material);
          arm.rotation.z = (Math.PI / 3) * i;
          asterisk.add(arm);
        }
        scene.add(asterisk);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(4, 6, 6);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0xbfe3ff, 0.8);
        rimLight.position.set(-5, -2, -4);
        scene.add(rimLight);
        const ambient = new THREE.AmbientLight(0xffffff, 0.35);
        scene.add(ambient);

        // ── Layout — canvas size · vertical position · responsive scale ──
        let baseY = 0;
        let baseScale = 1;

        /** Updates canvas size and alignment. Returns false if the size is not established yet */
        function layout(): boolean {
          const width = host!.clientWidth;
          const height = host!.clientHeight;
          if (width === 0 || height === 0) return false;

          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          paintBackdrop(camera.aspect);

          // Visible world height at the camera distance → pixel↔world conversion factor
          const visibleHeight =
            2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
          const unitsPerPixel = visibleHeight / height;

          const targetPx = Math.min(
            height * SIZE_BY_HEIGHT,
            width * SIZE_BY_WIDTH,
          );
          baseScale = (targetPx * unitsPerPixel) / OBJECT_DIAMETER;

          // CENTER_Y above dead center (0.5) — pixel difference converted to world units
          baseY = (0.5 - CENTER_Y) * height * unitsPerPixel;
          return true;
        }

        // ── Loop ────────────────────────────────────────────────────────
        // The entrance motion (rising and settling) flows into the approved asset's slow perpetual rotation.
        const clock = new THREE.Clock();
        let frame = 0;

        /*
         * The entrance motion is for "someone watching". When opened in a
         * background tab, rAF is suspended, leaving the screen frozen in the
         * intro's first pose (small and low) — so in that case skip the
         * entrance motion and draw the settled pose from the start.
         */
        const playIntro = !document.hidden;

        function draw() {
          const t = clock.getElapsedTime();
          const progress = playIntro
            ? Math.min(1, (t * 1000) / INTRO_DURATION)
            : 1;
          const eased = 1 - Math.pow(1 - progress, 3);
          const settling = 1 - eased;

          // Slow in-plane rotation in place while staying frontal + a subtle 3D tilt
          asterisk.rotation.z = t * 0.35 - settling * 0.5;
          asterisk.rotation.y = Math.sin(t * 0.4) * 0.45;
          asterisk.rotation.x = Math.cos(t * 0.31) * 0.3;
          asterisk.position.y =
            baseY + Math.sin(t * 0.6) * 0.12 - settling * 0.9;
          asterisk.scale.setScalar(baseScale * (0.82 + 0.18 * eased));

          renderer.render(scene, camera);
        }

        // Draw only after the size is established — ResizeObserver fires on
        // its initial observation too, so even if the layout is still 0 at
        // mount, it catches up shortly.
        const resizeObserver = new ResizeObserver(() => {
          if (layout()) draw();
        });
        resizeObserver.observe(host);

        if (layout()) draw();

        // When the tab becomes visible again (rAF was suspended meanwhile), refresh one frame immediately.
        const onVisibility = () => {
          if (!document.hidden && layout()) draw();
        };
        document.addEventListener("visibilitychange", onVisibility);

        function animate() {
          frame = requestAnimationFrame(animate);
          // Do not draw while the tab is hidden (saves battery/GPU).
          if (document.hidden) return;
          draw();
        }
        animate();

        teardown = () => {
          cancelAnimationFrame(frame);
          document.removeEventListener("visibilitychange", onVisibility);
          resizeObserver.disconnect();
          renderer.domElement.remove();
          armGeometry.dispose();
          material.dispose();
          skyTexture.dispose();
          environment.texture.dispose();
          pmrem.dispose();
          renderer.dispose();
        };
      } catch {
        // No WebGL, three load failure, or missing tokens — either way, fall back to the static replacement.
        if (!disposed) unavailableRef.current();
      }
    })();

    return () => {
      disposed = true;
      teardown?.();
    };
  }, []);

  return <div className="welcome__canvas" ref={hostRef} aria-hidden="true" />;
}
