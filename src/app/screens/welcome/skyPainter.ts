/*
 * skyPainter — 하늘 배경(그라디언트 · 뭉게구름 · 능선)을 그리는 단일 페인터
 * ---------------------------------------------------------------------------
 * Spec: 웰컴 인트로 — 임팩트 3D 버전(A안) · "3D 오브젝트 + 배경 일러스트"
 *
 * 같은 그림을 두 곳에서 쓴다. 그래서 그리는 코드를 한 벌만 둔다.
 *   1. WebGL 씬의 `scene.background` 텍스처 — 유리 오브젝트가 하늘과 구름을
 *      **굴절**시켜야 하므로 배경이 씬 안에 있어야 한다. CSS로 깔면 굴절 대상이
 *      되지 못해 오브젝트가 거의 사라진다.
 *   2. DOM의 2D 캔버스(SkyBackdrop) — 3D가 없는 환경(모션 축소·WebGL 미지원)의
 *      대체 배경이자, 흐름 4단계 화면이 인트로와 같은 세계를 공유하기 위한 배경.
 *
 * 색은 전부 tokens.css의 `--hero-*` 후보 토큰에서 읽는다(하드코딩 0). 도형의
 * 좌표·반지름은 정규화(0~1) 기하값이라 토큰의 대상이 아니다.
 * ---------------------------------------------------------------------------
 */

/** 페인터가 쓰는 색 묶음 — 전부 토큰에서 읽어 채운다 */
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
 * tokens.css에서 하늘 팔레트를 읽는다. 토큰이 하나라도 비면 예외를 던져
 * 호출부가 그리기를 포기하게 한다 — 원시 색이 코드로 새어 들어오지 않게 하는 장치.
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
 * `#rrggbb` 토큰에 투명도를 입힌다. 토큰 **값을 바꾸는** 포맷 변환이 아니라,
 * 장식 레이어를 겹치기 위해 런타임에 알파만 파생하는 것이다(원본은 tokens.css).
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

/** 뭉게구름 1덩이 — 정규화 좌표(화면 폭·높이 대비)와 크기 */
interface CloudSpec {
  /** 구름 중심 x (0~1, 화면 폭 대비) */
  x: number;
  /** 구름 중심 y (0~1, 화면 높이 대비) */
  y: number;
  /** 구름 폭 (0~1, 화면 폭 대비) */
  w: number;
  /** 불투명도 — 멀리 있는 구름일수록 옅게 */
  alpha: number;
}

/**
 * 히어로의 구름 배치 — 참고 영상처럼 화면 좌우와 아래를 두르는 띠를 이루되,
 * 정중앙(오브젝트와 카피가 겹쳐 놓이는 자리)은 비워 둔다.
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

/** 흐름 4단계 화면의 잔잔한 배치 — 바닥 근처에만 옅게 깔린다 */
const CALM_CLOUDS: readonly CloudSpec[] = [
  { x: 0.1, y: 0.84, w: 0.16, alpha: 0.7 },
  { x: 0.88, y: 0.82, w: 0.15, alpha: 0.7 },
  { x: 0.48, y: 0.9, w: 0.13, alpha: 0.5 },
];

/**
 * 뭉게구름 실루엣 — 겹친 원으로 만든 정규화 템플릿 3종. 모든 구름이 같은 모양이면
 * 벽지처럼 보이므로, 인덱스로 돌려 가며 실루엣을 다르게 준다.
 * 각 원은 [중심 x, 중심 y, 반지름]이며 구름 폭(=1.0) 기준이다.
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
   * 구름 크기의 기준 길이. 폭만 쓰면 세로로 긴 화면(모바일)에서 구름이 잘게
   * 흩어져 무늬처럼 보이므로, 높이도 함께 본 값을 기준으로 삼는다.
   */
  const scale = Math.max(w, h * 0.9);
  const cw = spec.w * scale;
  const cx = spec.x * w;
  const cy = spec.y * h;

  const gradient = ctx.createLinearGradient(0, cy - cw * 0.32, 0, cy + cw * 0.16);
  gradient.addColorStop(0, withAlpha(palette.cloud, spec.alpha));
  gradient.addColorStop(1, withAlpha(palette.cloudShade, spec.alpha));

  ctx.save();
  // 겹친 원의 이음매를 지우는 아주 약한 블러. 미지원 브라우저에서는 무시되고
  // 윤곽만 조금 또렷해질 뿐이라 그림이 깨지지 않는다(구현 설정값).
  ctx.filter = `blur(${Math.max(1, cw * 0.012)}px)`;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (const [dx, dy, r] of shape) {
    ctx.moveTo(cx + (dx + r) * cw, cy + dy * cw);
    ctx.arc(cx + dx * cw, cy + dy * cw, r * cw, 0, Math.PI * 2);
  }
  // 평평한 바닥 — 뭉게구름 특유의 수평 밑면
  ctx.rect(cx - cw * 0.44, cy, cw * 0.86, cw * 0.09);
  ctx.fill();
  ctx.restore();
}

/**
 * 능선 1겹 — 정규화 높이값(0~1)을 부드러운 곡선으로 이어 그린다. 직선으로
 * 이으면 각진 톱니가 보여 하늘 그림과 어울리지 않는다.
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
 * 하늘 배경을 캔버스에 그린다.
 *
 * - `hero` : 짙은 파랑에서 옅은 하늘로 내려오는 전면 그라디언트 + 구름 띠 +
 *   능선. 웰컴 인트로와 그 3D 씬 배경이 쓴다.
 * - `calm` : 위는 투명하고 아래로 갈수록 옅은 하늘이 스미는 잔잔한 버전.
 *   흐름 4단계 화면이 인트로와 같은 세계를 공유하되, 폼·대화의 가독성을
 *   해치지 않도록 콘텐츠가 놓이는 상단은 비워 둔다.
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
