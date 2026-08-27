/*
 * DriftingClouds — 풀이 화면 좌측에서 천천히 흘러가는 구름
 * ---------------------------------------------------------------------------
 * 웰컴 인트로의 하늘과 같은 뭉게구름 실루엣(겹친 원 + 평평한 밑면)을 그대로
 * 쓰되, 여기서는 가로로 아주 느리게 흘려보낸다. 문제를 붙들고 있는 시간 동안
 * 화면이 완전히 정지해 있지 않도록 하는 정도의 움직임이다 — 시선을 끌면
 * 대화에 방해가 되므로 느리고 옅게 둔다.
 *
 * 장식이라 aria-hidden이며 포인터 이벤트를 받지 않는다.
 * `prefers-reduced-motion`에서는 흐르지 않고 제자리에 선다(CSS에서 처리).
 * ---------------------------------------------------------------------------
 */

/** 구름 실루엣 — [중심 x, 중심 y, 반지름], viewBox 120×48 기준 */
const PUFFS: readonly [number, number, number][] = [
  [26, 30, 14],
  [48, 22, 20],
  [72, 26, 17],
  [94, 32, 12],
];

/** 흘려보낼 구름들 — 위치·크기·속도를 달리해 같은 무늬로 보이지 않게 */
const CLOUDS = [
  { id: "a", top: "12%", scale: 1, duration: "68s", delay: "0s", opacity: 0.5 },
  { id: "b", top: "34%", scale: 0.66, duration: "94s", delay: "-30s", opacity: 0.34 },
  { id: "c", top: "58%", scale: 1.2, duration: "78s", delay: "-52s", opacity: 0.42 },
  { id: "d", top: "78%", scale: 0.8, duration: "110s", delay: "-14s", opacity: 0.28 },
] as const;

export function DriftingClouds() {
  return (
    <div className="drifting-clouds" aria-hidden="true">
      {CLOUDS.map((cloud) => (
        <span
          key={cloud.id}
          className="drifting-clouds__cloud"
          style={
            {
              top: cloud.top,
              opacity: cloud.opacity,
              "--cloud-scale": cloud.scale,
              "--cloud-duration": cloud.duration,
              "--cloud-delay": cloud.delay,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 120 48" role="presentation" focusable="false">
            {PUFFS.map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
            <rect x="12" y="30" width="96" height="10" />
          </svg>
        </span>
      ))}
    </div>
  );
}
