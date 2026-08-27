/*
 * SkyBackdrop — 하늘 배경을 그리는 2D 캔버스 레이어
 * ---------------------------------------------------------------------------
 * `skyPainter.ts`의 단일 페인터를 DOM 캔버스에 그린다. 쓰임은 둘이다.
 *
 *   variant="hero" : 웰컴 인트로의 바탕. WebGL이 뜨면 그 위를 3D 캔버스가
 *     덮으므로(같은 그림을 씬 배경으로 다시 그린다) 보이지 않지만, 모션 축소·
 *     WebGL 미지원 환경에서는 이 레이어가 그대로 배경이 된다.
 *   variant="calm" : 흐름 4단계 화면(AppShell)의 바탕. 인트로와 같은 세계를
 *     공유하되 상단을 비워 폼·대화의 가독성을 지킨다.
 *
 * 장식 전용이라 aria-hidden이며 포인터 이벤트를 받지 않는다. 토큰을 읽지 못하면
 * 아무것도 그리지 않고 조용히 비운다 — 배경이 없어도 화면은 그대로 동작한다.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import {
  paintSky,
  readSkyPalette,
  type SkyPalette,
  type SkyVariant,
} from "./skyPainter";

interface SkyBackdropProps {
  variant: SkyVariant;
  /** 루트에 붙일 클래스 — 화면마다 배치(절대/고정)가 다르다 */
  className: string;
}

export function SkyBackdrop({ variant, className }: SkyBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let palette: SkyPalette;
    try {
      palette = readSkyPalette();
    } catch {
      return; // 토큰 누락 — 배경 없이 진행
    }

    function render() {
      const el = canvasRef.current;
      if (!el || !palette) return;
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width === 0 || height === 0) return;

      // 픽셀 밀도는 2배까지만 — 그 이상은 비용만 늘고 눈에 띄지 않는다.
      const ratio = Math.min(window.devicePixelRatio, 2);
      el.width = Math.round(width * ratio);
      el.height = Math.round(height * ratio);

      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintSky(ctx, width, height, palette, variant);
    }

    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [variant]);

  return <canvas className={className} ref={canvasRef} aria-hidden="true" />;
}
