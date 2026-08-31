/*
 * BrandMark — product mark (six-armed star glyph + wordmark)
 * ---------------------------------------------------------------------------
 * A small glyph reduction of the same shape as the 3D object in the welcome
 * intro. The intro and the four flow-step screens share the same mark, so the
 * impression of looking at the same product is never broken when moving from
 * the full-screen hero into the shell.
 *
 * `tone` supports both backgrounds — white on the deep sky (`on-sky`), and
 * the neutral text token on the white header (`on-surface`).
 *
 * Passing `to` turns it into a link. The mark in the header is the door back
 * to the start (welcome), and it is never blocked even after submitting —
 * a candidate should be able to return to the first screen at any time so
 * they never feel trapped.
 * ---------------------------------------------------------------------------
 */

import { Link } from "react-router-dom";
import { strings } from "../i18n";

/** Six arms = 3 capsules × 60° */
const ARM_ANGLES = [0, 60, 120];

interface BrandMarkProps {
  tone: "on-sky" | "on-surface";
  /** When given, becomes a link to this path. Otherwise, plain display */
  to?: string;
}

export function BrandMark({ tone, to }: BrandMarkProps) {
  const content = (
    <>
      <svg
        className="brand-mark__glyph"
        viewBox="0 0 24 24"
        role="presentation"
        focusable="false"
      >
        {ARM_ANGLES.map((angle) => (
          <rect
            key={angle}
            x="10.2"
            y="2.6"
            width="3.6"
            height="18.8"
            rx="1.8"
            fill="currentColor"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
      </svg>
      <span className="brand-mark__word">{strings.app.productName}</span>
    </>
  );

  if (!to) {
    return <span className={`brand-mark brand-mark--${tone}`}>{content}</span>;
  }

  return (
    <Link
      className={`brand-mark brand-mark--${tone} brand-mark--link`}
      to={to}
      aria-label={strings.app.homeLabel}
    >
      {content}
    </Link>
  );
}
