/*
 * skyPainter — the single painter that draws the sky backdrop (gradient · cumulus clouds · ridgelines)
 * ---------------------------------------------------------------------------
 * Spec: Welcome intro — impact 3D version (option A) · "3D object + background illustration"
 *
 * The same painting is used in two places, so the drawing code exists in
 * exactly one copy.
 *   1. The WebGL scene's `scene.background` texture — the glass object must
 *      **refract** the sky and clouds, so the backdrop has to live inside the
 *      scene. Laid down as CSS it cannot be a refraction target and the
 *      object all but disappears.
 *   2. The DOM's 2D canvas (SkyBackdrop) — the fallback backdrop for
 *      environments without 3D (reduced motion, no WebGL), and the backdrop
 *      through which the four flow-step screens share the same world as the
 *      intro.
 *
 * Colors are all read from the `--hero-*` candidate tokens in tokens.css
 * (zero hardcoding). The shapes' coordinates and radii are normalized (0–1)
 * geometry values, not subject to tokens.
 * ---------------------------------------------------------------------------
 */

/** The set of colors the painter uses — all filled in by reading tokens */
export interface SkyPalette {
  skyTop: string;
  skyMid: string;
  skyBase: string;
  cloud: string;
  cloudShade: string;
  hillFar: string;
  hillNear: string;
  hillFore: string;
}

const TOKEN_NAMES: Record<keyof SkyPalette, string> = {
  skyTop: "--hero-sky-top",
  skyMid: "--hero-sky-mid",
  skyBase: "--hero-sky-base",
  cloud: "--hero-cloud",
  cloudShade: "--hero-cloud-shade",
  hillFar: "--hero-hill-far",
  hillNear: "--hero-hill-near",
  hillFore: "--hero-hill-fore",
};

/**
 * Reads the sky palette from tokens.css. If even one token is empty, an
 * exception is thrown so the caller abandons drawing — a mechanism keeping
 * raw colors from leaking into the code.
 */
export function readSkyPalette(): SkyPalette {
  const rootStyle = getComputedStyle(document.documentElement);
  const entries = Object.entries(TOKEN_NAMES) as [keyof SkyPalette, string][];
  const palette = {} as SkyPalette;
  for (const [key, name] of entries) {
    const value = rootStyle.getPropertyValue(name).trim();
    if (!value) throw new Error(`Missing sky token: ${name}`);
    palette[key] = value;
  }
  return palette;
}

/**
 * Applies transparency to a `#rrggbb` token. This is not a format conversion
 * that **changes the token's value** — it only derives an alpha at runtime to
 * layer decorative elements (the source of truth remains tokens.css).
 */
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** One cumulus cloud — normalized coordinates (relative to screen width/height) and size */
interface CloudSpec {
  /** Cloud center x (0–1, relative to screen width) */
  x: number;
  /** Cloud center y (0–1, relative to screen height) */
  y: number;
  /** Cloud width (0–1, relative to screen width) */
  w: number;
  /** Opacity — the farther the cloud, the fainter */
  alpha: number;
}

/**
 * The hero's cloud arrangement — like the reference video, forming a band
 * around the sides and bottom of the screen, while the very center (where the
 * object and copy overlap) is left empty.
 */
const HERO_CLOUDS: readonly CloudSpec[] = [
  { x: 0.04, y: 0.52, w: 0.19, alpha: 0.9 },
  { x: 0.17, y: 0.68, w: 0.15, alpha: 0.8 },
  { x: 0.02, y: 0.8, w: 0.13, alpha: 0.62 },
  { x: 0.96, y: 0.5, w: 0.18, alpha: 0.9 },
  { x: 0.84, y: 0.66, w: 0.14, alpha: 0.78 },
  { x: 0.99, y: 0.79, w: 0.13, alpha: 0.6 },
  { x: 0.4, y: 0.85, w: 0.13, alpha: 0.66 },
  { x: 0.63, y: 0.82, w: 0.12, alpha: 0.6 },
  { x: 0.28, y: 0.44, w: 0.07, alpha: 0.3 },
  { x: 0.73, y: 0.42, w: 0.06, alpha: 0.28 },
];

/** The calm arrangement for the four flow-step screens — laid faintly near the bottom only */
const CALM_CLOUDS: readonly CloudSpec[] = [
  { x: 0.1, y: 0.84, w: 0.16, alpha: 0.7 },
  { x: 0.88, y: 0.82, w: 0.15, alpha: 0.7 },
  { x: 0.48, y: 0.9, w: 0.13, alpha: 0.5 },
];

/**
 * Cumulus silhouettes — three normalized templates made of overlapping
 * circles. If every cloud had the same shape it would look like wallpaper, so
 * the silhouettes are varied by cycling through them by index.
 * Each circle is [center x, center y, radius] relative to the cloud width (=1.0).
 */
const CLOUD_SHAPES: readonly (readonly [number, number, number][])[] = [
  [
    [-0.4, 0.06, 0.11],
    [-0.22, -0.05, 0.16],
    [-0.02, -0.13, 0.19],
    [0.18, -0.03, 0.15],
    [0.36, 0.07, 0.11],
  ],
  [
    [-0.36, 0.05, 0.13],
    [-0.14, -0.11, 0.19],
    [0.1, -0.03, 0.16],
    [0.31, 0.06, 0.12],
  ],
  [
    [-0.3, 0.07, 0.12],
    [-0.09, -0.09, 0.18],
    [0.14, -0.01, 0.14],
    [0.33, 0.08, 0.1],
  ],
];

function drawCloud(
  ctx: CanvasRenderingContext2D,
  spec: CloudSpec,
  shape: readonly (readonly [number, number, number])[],
  w: number,
  h: number,
  palette: SkyPalette,
) {
  /*
   * The reference length for cloud size. Using width alone would scatter the
   * clouds into a fine pattern on tall screens (mobile), so the reference
   * also takes the height into account.
   */
  const scale = Math.max(w, h * 0.9);
  const cw = spec.w * scale;
  const cx = spec.x * w;
  const cy = spec.y * h;

  const gradient = ctx.createLinearGradient(0, cy - cw * 0.32, 0, cy + cw * 0.16);
  gradient.addColorStop(0, withAlpha(palette.cloud, spec.alpha));
  gradient.addColorStop(1, withAlpha(palette.cloudShade, spec.alpha));

  ctx.save();
  // A very slight blur that erases the seams between overlapping circles. In
  // unsupported browsers it is ignored and the outlines just look a bit
  // crisper — the painting does not break (implementation setting).
  ctx.filter = `blur(${Math.max(1, cw * 0.012)}px)`;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (const [dx, dy, r] of shape) {
    ctx.moveTo(cx + (dx + r) * cw, cy + dy * cw);
    ctx.arc(cx + dx * cw, cy + dy * cw, r * cw, 0, Math.PI * 2);
  }
  // Flat bottom — the horizontal underside characteristic of cumulus clouds
  ctx.rect(cx - cw * 0.44, cy, cw * 0.86, cw * 0.09);
  ctx.fill();
  ctx.restore();
}

/**
 * One ridgeline layer — connects normalized height values (0–1) with smooth
 * curves. Connecting them with straight lines would show angular sawteeth
 * that clash with the sky painting.
 */
function drawRidge(
  ctx: CanvasRenderingContext2D,
  points: readonly number[],
  color: string,
  alpha: number,
  w: number,
  h: number,
) {
  const step = w / (points.length - 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, points[0] * h);
  for (let i = 0; i < points.length - 1; i += 1) {
    const x = i * step;
    const midX = x + step / 2;
    const midY = ((points[i] + points[i + 1]) / 2) * h;
    ctx.quadraticCurveTo(x, points[i] * h, midX, midY);
  }
  ctx.lineTo(w, points[points.length - 1] * h);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const RIDGE_FAR = [0.9, 0.86, 0.91, 0.87, 0.92, 0.885, 0.91];
const RIDGE_NEAR = [0.935, 0.915, 0.95, 0.925, 0.955, 0.93, 0.945];
const RIDGE_FORE = [0.965, 0.955, 0.975, 0.96, 0.98, 0.965, 0.972];

export type SkyVariant = "hero" | "calm";

/**
 * Paints the sky backdrop onto a canvas.
 *
 * - `hero` : a full gradient descending from deep blue to pale sky + the
 *   cloud band + ridgelines. Used by the welcome intro and its 3D scene
 *   background.
 * - `calm` : a quiet version, transparent at the top with pale sky seeping in
 *   toward the bottom. Used by the four flow-step screens to share the same
 *   world as the intro while leaving the top — where content sits — empty so
 *   the readability of forms and conversation is not harmed.
 */
export function paintSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: SkyPalette,
  variant: SkyVariant = "hero",
): void {
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  if (variant === "hero") {
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(0.45, palette.skyMid);
    gradient.addColorStop(1, palette.skyBase);
  } else {
    gradient.addColorStop(0, withAlpha(palette.skyBase, 0));
    gradient.addColorStop(0.55, withAlpha(palette.skyBase, 0.35));
    gradient.addColorStop(1, withAlpha(palette.skyBase, 1));
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const clouds = variant === "hero" ? HERO_CLOUDS : CALM_CLOUDS;
  const cloudFade = variant === "hero" ? 1 : 0.6;
  clouds.forEach((spec, i) => {
    const shape = CLOUD_SHAPES[i % CLOUD_SHAPES.length];
    drawCloud(
      ctx,
      { ...spec, alpha: spec.alpha * cloudFade },
      shape,
      w,
      h,
      palette,
    );
  });

  const ridgeFade = variant === "hero" ? 1 : 0.55;
  drawRidge(ctx, RIDGE_FAR, palette.hillFar, 0.4 * ridgeFade, w, h);
  drawRidge(ctx, RIDGE_NEAR, palette.hillNear, 0.55 * ridgeFade, w, h);
  drawRidge(ctx, RIDGE_FORE, palette.hillFore, 0.85 * ridgeFade, w, h);
}
