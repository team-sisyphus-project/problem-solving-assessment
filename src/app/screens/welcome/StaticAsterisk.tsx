/*
 * StaticAsterisk — 웰컴 인트로 오브젝트의 정적 대체(SVG)
 * ---------------------------------------------------------------------------
 * Spec: 웰컴 인트로 — 임팩트 3D 버전(A안) · 주요 흐름 5
 *
 * 아래 세 경우에 3D 대신 이 SVG가 같은 자리에 같은 실루엣으로 놓인다.
 *   1. `prefers-reduced-motion: reduce` — 모션 없는 동일 카피·레이아웃(스펙 요구).
 *   2. WebGL 미지원·컨텍스트 생성 실패.
 *   3. three 청크 로드 실패 또는 히어로 토큰 누락.
 *
 * 3D와 같은 기하(캡슐 3개를 60°씩 돌린 6갈래 별)를 2D로 옮긴 것이라, 대체로
 * 내려가도 화면의 인상이 바뀌지 않는다. 색은 웰컴 히어로 토큰만 참조한다.
 * viewBox 좌표(기하 형태)는 색·간격 토큰의 대상이 아니므로 리터럴이다.
 * ---------------------------------------------------------------------------
 */

/** 6갈래 = 캡슐 3개 × 60° */
const ARM_ANGLES = [0, 60, 120];

export function StaticAsterisk() {
  return (
    <svg
      className="welcome__static-object"
      viewBox="0 0 200 200"
      role="presentation"
      focusable="false"
    >
      <defs>
        <linearGradient id="welcome-glass" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="var(--hero-cloud)" stopOpacity="0.95" />
          <stop
            offset="0.5"
            stopColor="var(--hero-object-tint)"
            stopOpacity="0.72"
          />
          <stop
            offset="1"
            stopColor="var(--hero-object-attenuation)"
            stopOpacity="0.85"
          />
        </linearGradient>
      </defs>

      {ARM_ANGLES.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 100 100)`}>
          {/* 캡슐 본체 — 유리 틴트 그라디언트 */}
          <rect
            x="89"
            y="36"
            width="22"
            height="128"
            rx="11"
            fill="url(#welcome-glass)"
            stroke="var(--hero-cloud)"
            strokeOpacity="0.55"
            strokeWidth="1"
          />
          {/* 하이라이트 — 광택을 만드는 가는 흰 줄 */}
          <rect
            x="94"
            y="44"
            width="4"
            height="112"
            rx="2"
            fill="var(--hero-cloud)"
            fillOpacity="0.5"
          />
        </g>
      ))}
    </svg>
  );
}
