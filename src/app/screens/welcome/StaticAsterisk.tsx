/*
 * StaticAsterisk — static replacement (SVG) for the welcome intro object
 * ---------------------------------------------------------------------------
 * Spec: Welcome intro — impact 3D version (option A) · main flow 5
 *
 * In the three cases below, this SVG takes the 3D object's place with the
 * same silhouette in the same position.
 *   1. `prefers-reduced-motion: reduce` — same copy and layout without motion (spec requirement).
 *   2. No WebGL support, or context creation failure.
 *   3. three chunk load failure, or missing hero tokens.
 *
 * It is the same geometry as the 3D object (a six-armed star made of 3
 * capsules rotated 60° apart) translated into 2D, so falling back to it does
 * not change the impression of the screen. Colors reference only the welcome
 * hero tokens. The viewBox coordinates (geometric shape) are not subject to
 * color/spacing tokens, so they are literals.
 * ---------------------------------------------------------------------------
 */

/** Six arms = 3 capsules × 60° */
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
          {/* Capsule body — glass tint gradient */}
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
          {/* Highlight — a thin white streak that creates the gloss */}
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
