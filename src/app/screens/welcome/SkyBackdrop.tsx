/*
 * SkyBackdrop — a 2D canvas layer that paints the sky backdrop
 * ---------------------------------------------------------------------------
 * Draws the single painter from `skyPainter.ts` onto a DOM canvas. It has two
 * uses.
 *
 *   variant="hero" : the base of the welcome intro. When WebGL loads, the 3D
 *     canvas covers it (the same painting is redrawn as the scene background)
 *     so it is not visible, but in reduced-motion or non-WebGL environments
 *     this layer remains the backdrop as is.
 *   variant="calm" : the base of the four flow-step screens (AppShell).
 *     Shares the same world as the intro but leaves the top empty to preserve
 *     the readability of forms and conversation.
 *
 * Purely decorative, so it is aria-hidden and receives no pointer events. If
 * the tokens cannot be read, it paints nothing and stays quietly empty — the
 * screen works fine without a backdrop.
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
  /** Class attached to the root — placement (absolute/fixed) differs per screen */
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
      return; // Missing tokens — proceed without a backdrop
    }

    function render() {
      const el = canvasRef.current;
      if (!el || !palette) return;
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width === 0 || height === 0) return;

      // Pixel density capped at 2x — beyond that only cost rises with no visible gain.
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
