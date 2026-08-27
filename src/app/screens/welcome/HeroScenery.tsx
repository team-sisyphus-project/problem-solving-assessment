/*
 * HeroScenery — 웰컴 인트로 배경 일러스트(구름 + 언덕)
 * ---------------------------------------------------------------------------
 * Spec: 웰컴 인트로 — 임팩트 3D 버전(A안) · 화면 구성 "3D 오브젝트 + 배경 일러스트"
 *
 * 하늘 그라디언트 자체는 두 겹으로 그려진다 — CSS(.welcome__sky)가 바탕을 깔고,
 * 그 위 WebGL 캔버스가 같은 그라디언트를 씬 배경으로 다시 그려 유리가 하늘을
 * 굴절시키게 한다. 이 컴포넌트는 그 위에 얹히는 구름·언덕만 담당한다.
 *
 * 구름은 오브젝트가 놓이는 화면 중앙을 피해 좌우 가장자리에 배치한다 — 캔버스
 * 위 레이어라서 중앙에 두면 오브젝트를 가린다. 언덕은 화면 맨 아래 띠라 겹치지
 * 않는다. 전부 장식이므로 aria-hidden이며 포인터 이벤트를 받지 않는다.
 *
 * 색은 웰컴 히어로 토큰만 참조한다(하드코딩 0). 언덕 path의 좌표는 기하 형태라
 * 리터럴이며, 가로는 화면 폭에 맞춰 늘어난다(preserveAspectRatio="none").
 * ---------------------------------------------------------------------------
 */

/** 구름 3덩이 — 중앙(오브젝트 자리)을 비우는 위치 수식자 */
const CLOUDS = ["a", "b", "c"] as const;

export function HeroScenery() {
  return (
    <div className="welcome__scenery" aria-hidden="true">
      {CLOUDS.map((id) => (
        <span key={id} className={`welcome__cloud welcome__cloud--${id}`} />
      ))}

      <svg
        className="welcome__hills"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        role="presentation"
        focusable="false"
      >
        {/* 원경 — 가장 짙고 낮게 깔린 능선 */}
        <path
          fill="var(--hero-hill-far)"
          fillOpacity="0.55"
          d="M0 168 C 180 118, 340 196, 520 172 C 720 145, 880 208, 1080 178 C 1240 154, 1360 186, 1440 170 L1440 320 L0 320 Z"
        />
        {/* 중경 */}
        <path
          fill="var(--hero-hill-near)"
          fillOpacity="0.8"
          d="M0 224 C 200 178, 360 246, 560 226 C 760 206, 920 258, 1120 232 C 1280 212, 1380 240, 1440 228 L1440 320 L0 320 Z"
        />
        {/* 근경 — 가장 옅고 높게 올라와 화면 바닥을 정리한다 */}
        <path
          fill="var(--hero-hill-fore)"
          d="M0 272 C 220 240, 420 292, 640 276 C 860 260, 1020 296, 1220 280 C 1330 271, 1400 284, 1440 278 L1440 320 L0 320 Z"
        />
      </svg>
    </div>
  );
}
