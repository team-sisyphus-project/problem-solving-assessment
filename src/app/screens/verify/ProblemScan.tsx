/*
 * ProblemScan — the "scanning down the problem" effect on the left of the identity verification screen
 * ---------------------------------------------------------------------------
 * A transplant of the scan motion from the reference video. A highlight moves
 * word by word across lines of text tilted in perspective; only the band in
 * focus is sharp while the rest is blurred.
 *
 * The heart of the implementation is **layering the same text twice**.
 *   - Blurred layer (blur)  : the floor, laying the whole text down blurred.
 *   - Sharp layer (sharp)   : masked with a horizontal band **fixed** in
 *     screen coordinates.
 * Both layers are pushed up by the same amount, so the sharp band always
 * stays in the same place while the text flows underneath it. Because the
 * text moves rather than the mask, the band and the text never fall out of
 * sync.
 *
 * This paragraph is readable content, not decoration — screen readers read
 * it as an ordinary paragraph, and the spans wrapping each word serve the
 * visual effect only.
 *
 * Under `prefers-reduced-motion`, the highlight does not move and the text
 * stays untilted at its initial position (the same sentence remains readable
 * as is).
 *
 * Colors and spacing reference tokens only. Values like rotation angle, mask
 * position, and cycle timing — "values users cannot perceive as color or
 * spacing when changed" — are implementation settings, so they are literals.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { strings } from "../../i18n";

/** How long the highlight lingers on one word (ms) — close to reading speed */
const WORD_INTERVAL = 240;

/** Vertical position of the sharp band (relative to panel height) */
const FOCUS_ANCHOR = 0.3;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function ProblemScan() {
  const s = strings.screens.verify;
  const words = s.scanBody.split(" ");

  const panelRef = useRef<HTMLDivElement>(null);
  const sharpRef = useRef<HTMLParagraphElement>(null);

  const [active, setActive] = useState(0);
  const [shift, setShift] = useState(0);
  const reduced = usePrefersReducedMotion();

  // Advance the highlight one word at a time. On reaching the end, wrap back to the start and repeat.
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % words.length);
    }, WORD_INTERVAL);
    return () => window.clearInterval(timer);
  }, [reduced, words.length]);

  /*
   * Push the whole text up so the active word lands on the sharp band. Where
   * the browser broke the lines is only knowable after render, so we measure
   * the actual span's position and move accordingly (no precomputing line
   * counts).
   */
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const activeEl = sharpRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    if (!panel || !activeEl) return;
    const anchor = panel.clientHeight * FOCUS_ANCHOR;
    setShift(anchor - (activeEl.offsetTop + activeEl.offsetHeight / 2));
  }, [active]);

  const stageStyle = { "--scan-shift": `${shift}px` } as React.CSSProperties;

  const renderWords = (sharp: boolean) =>
    words.map((word, i) => (
      <span
        key={`${i}-${word}`}
        className={
          i === active ? "scan__word scan__word--active" : "scan__word"
        }
        {...(sharp && i === active ? { "data-active": "true" } : {})}
      >
        {word}{" "}
      </span>
    ));

  return (
    <div className="scan" ref={panelRef}>
      <span className="scan__label">{s.scanLabel}</span>

      {/* Blurred floor layer — lays the same text down blurred in full (hidden from screen readers as a duplicate) */}
      <div className="scan__layer scan__layer--blur" aria-hidden="true">
        <div className="scan__stage" style={stageStyle}>
          <p className="scan__text">{renderWords(false)}</p>
        </div>
      </div>

      {/* Sharp layer — lets only a horizontal band fixed on screen pass through. The paragraph's source text lives here */}
      <div className="scan__layer scan__layer--sharp">
        <div className="scan__stage" style={stageStyle}>
          <p className="scan__text" ref={sharpRef}>
            {renderWords(true)}
          </p>
        </div>
      </div>
    </div>
  );
}
