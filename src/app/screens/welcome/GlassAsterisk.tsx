/*
 * GlassAsterisk — 웰컴 인트로 중앙의 광택 유리 3D 오브젝트 (WebGL)
 * ---------------------------------------------------------------------------
 * Spec: 웰컴 인트로 — 임팩트 3D 버전(A안)
 *
 * 확정된 모션 에셋(캡슐 3개를 60°씩 돌려 만든 6갈래 별 + MeshPhysicalMaterial
 * 투과 유리)을 이 화면에 이식한 것이다. 참고 영상과 같은 인상을 내려면 배경이
 * 씬 **안**에 있어야 한다 — 유리가 하늘과 구름을 굴절시켜야 하기 때문이다.
 * 그래서 `skyPainter`의 페인터로 그린 캔버스를 `scene.background`에 물리고,
 * 화면 비율이 바뀌면 다시 그린다.
 *
 * 오브젝트는 카피 **뒤**에 놓인다(참고 영상과 같은 겹침 구성). 크기는 뷰포트
 * 비율로 정해 어느 화면에서도 카피를 삼키지 않을 만큼만 차지한다.
 *
 * 이 스펙이 전제로 못박은 "신규 라이브러리 도입"의 실체가 three다. 초기 번들에
 * 얹지 않으려고 동적 import로 필요한 순간에만 불러온다 — 흐름 4단계 화면은
 * three를 전혀 로드하지 않는다.
 *
 * 색 값은 하드코딩하지 않는다. tokens.css의 웰컴 히어로 토큰 후보를
 * getComputedStyle로 읽어 씬에 주입하고, 토큰이 하나라도 비면 렌더를 포기하고
 * 정적 대체(onUnavailable)로 내려간다 — 원시값이 이 파일에 스며들지 않게 하는 장치.
 *
 * 반대로 재질의 물리 파라미터(transmission·ior·thickness 등)와 카메라·조명
 * 좌표는 "값을 바꿔도 사용자가 색·간격으로 인지하지 못하는" 구현 설정값이라
 * 리터럴로 둔다(ui-conventions 규칙 1의 명시적 예외). 이 숫자들은 승인된 모션
 * 에셋에서 그대로 옮겨온 것이며, 임의로 조정하지 않는다.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { paintSky, readSkyPalette } from "./skyPainter";

/** 등장 모션 길이(ms) — 떠오르며 자리 잡는 1회성 인트로 */
const INTRO_DURATION = 1200;

/** 오브젝트의 외접 지름(월드 단위) — 캡슐 길이 3.4 + 양끝 반지름 0.44*2 */
const OBJECT_DIAMETER = 4.28;

/**
 * 화면 대비 오브젝트 크기 — 세로/가로 중 더 빡빡한 쪽에 맞춘다. 참고 영상의
 * 비율(히어로 높이의 절반 남짓)을 따르되, 카피를 덮어 읽기 어려워지지 않도록
 * 한 단계 작게 잡았다.
 */
const SIZE_BY_HEIGHT = 0.46;
const SIZE_BY_WIDTH = 0.72;

/** 오브젝트 중심의 세로 위치(화면 높이 대비) — 정중앙보다 살짝 위 */
const CENTER_Y = 0.48;

/** 배경 텍스처 해상도(가로 고정, 세로는 화면 비율로) — 구현 설정값 */
const SKY_TEXTURE_WIDTH = 768;

interface GlassAsteriskProps {
  /** WebGL·토큰을 쓸 수 없어 정적 대체로 내려가야 할 때 알린다 */
  onUnavailable: () => void;
}

export function GlassAsterisk({ onUnavailable }: GlassAsteriskProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  // onUnavailable은 렌더마다 새 함수일 수 있으므로 ref로 고정한다 — 의존성에
  // 넣으면 씬 전체가 재생성된다.
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

        // ── 토큰 주입 ────────────────────────────────────────────────────
        // 색은 전부 tokens.css에서 읽는다. 비어 있으면 예외 → 정적 대체.
        const palette = readSkyPalette();
        const rootStyle = getComputedStyle(document.documentElement);
        const token = (name: string): string => {
          const value = rootStyle.getPropertyValue(name).trim();
          if (!value) throw new Error(`Missing hero token: ${name}`);
          return value;
        };
        const objectTint = token("--hero-object-tint");
        const objectAttenuation = token("--hero-object-attenuation");

        // ── 렌더러 ──────────────────────────────────────────────────────
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

        // ── 하늘 배경(굴절 대상) ─────────────────────────────────────────
        // DOM의 SkyBackdrop과 같은 페인터로 그려 두 경로의 그림이 어긋나지 않는다.
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

        // ── 유리 재질 + 6갈래 별 ────────────────────────────────────────
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

        // ── 레이아웃 — 캔버스 크기 · 세로 위치 · 반응형 스케일 ───────────
        let baseY = 0;
        let baseScale = 1;

        /** 캔버스 크기·정렬을 갱신한다. 아직 크기가 잡히지 않았으면 false */
        function layout(): boolean {
          const width = host!.clientWidth;
          const height = host!.clientHeight;
          if (width === 0 || height === 0) return false;

          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          paintBackdrop(camera.aspect);

          // 카메라 거리에서 화면에 보이는 월드 높이 → 픽셀↔월드 환산 계수
          const visibleHeight =
            2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
          const unitsPerPixel = visibleHeight / height;

          const targetPx = Math.min(
            height * SIZE_BY_HEIGHT,
            width * SIZE_BY_WIDTH,
          );
          baseScale = (targetPx * unitsPerPixel) / OBJECT_DIAMETER;

          // 화면 정중앙(0.5) 대비 CENTER_Y만큼 위로 — 픽셀 차이를 월드로 환산
          baseY = (0.5 - CENTER_Y) * height * unitsPerPixel;
          return true;
        }

        // ── 루프 ────────────────────────────────────────────────────────
        // 등장 모션(떠오르며 자리 잡기) 뒤 승인 에셋의 느린 상시 회전으로 이어진다.
        const clock = new THREE.Clock();
        let frame = 0;

        /*
         * 등장 모션은 "보고 있는 사람"을 위한 것이다. 백그라운드 탭에서 열리면
         * rAF가 멈춰 있어 인트로 첫 자세(작고 낮은 상태)로 굳은 화면이 남으므로,
         * 그런 경우엔 등장 모션을 건너뛰고 처음부터 정지 자세로 그린다.
         */
        const playIntro = !document.hidden;

        function draw() {
          const t = clock.getElapsedTime();
          const progress = playIntro
            ? Math.min(1, (t * 1000) / INTRO_DURATION)
            : 1;
          const eased = 1 - Math.pow(1 - progress, 3);
          const settling = 1 - eased;

          // 정면을 유지한 채 제자리에서 천천히 도는 in-plane 회전 + 은은한 3D 기울임
          asterisk.rotation.z = t * 0.35 - settling * 0.5;
          asterisk.rotation.y = Math.sin(t * 0.4) * 0.45;
          asterisk.rotation.x = Math.cos(t * 0.31) * 0.3;
          asterisk.position.y =
            baseY + Math.sin(t * 0.6) * 0.12 - settling * 0.9;
          asterisk.scale.setScalar(baseScale * (0.82 + 0.18 * eased));

          renderer.render(scene, camera);
        }

        // 크기가 잡힌 뒤에만 그린다 — ResizeObserver가 최초 관측에서도 한 번
        // 호출되므로, 마운트 시점에 레이아웃이 아직 0이어도 곧 따라잡는다.
        const resizeObserver = new ResizeObserver(() => {
          if (layout()) draw();
        });
        resizeObserver.observe(host);

        if (layout()) draw();

        // 탭이 다시 보이면(그동안 rAF가 멈춰 있었다면) 한 프레임을 즉시 갱신한다.
        const onVisibility = () => {
          if (!document.hidden && layout()) draw();
        };
        document.addEventListener("visibilitychange", onVisibility);

        function animate() {
          frame = requestAnimationFrame(animate);
          // 탭이 가려지면 그리지 않는다(배터리·GPU 절약).
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
        // WebGL 미지원 · three 로드 실패 · 토큰 누락 — 어느 쪽이든 정적 대체로.
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
