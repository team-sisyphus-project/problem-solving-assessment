/*
 * DriftingClouds — clouds drifting slowly on the left of the solve screen
 * ---------------------------------------------------------------------------
 * Uses the same cumulus silhouette as the welcome intro's sky (overlapping
 * circles + a flat underside), but here they drift horizontally at a very
 * slow pace. Just enough movement to keep the screen from being completely
 * frozen during the time spent wrestling with the problem — anything
 * eye-catching would distract from the conversation, so they stay slow and
 * faint.
 *
 * Decoration only, so it is aria-hidden and receives no pointer events.
 * Under `prefers-reduced-motion` they do not drift and stand still (handled
 * in CSS).
 * ---------------------------------------------------------------------------
 */

/** Cloud silhouette — [center x, center y, radius], relative to a 120×48 viewBox */
const PUFFS: readonly [number, number, number][] = [
  [26, 30, 14],
  [48, 22, 20],
  [72, 26, 17],
  [94, 32, 12],
];

/** The clouds to drift — varied in position, size, and speed so they never read as a repeating pattern */
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
