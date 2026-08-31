/*
 * SolveTimer — elapsed time for problem solving
 * ---------------------------------------------------------------------------
 * This is **elapsed time**, not a time limit. A countdown becomes a device
 * that chases the candidate, and since this product is a place that looks at
 * the process rather than the answer, that pressure works against its
 * purpose. So there is only a clock counting up, with "no limit" stated
 * alongside it in the copy.
 *
 * The reference point is the session's startedAt, so a refresh does not reset
 * it to zero. It updates every second, but to keep screen readers from
 * announcing every second, aria-live is not used — only the label and value
 * are read.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { strings } from "../../i18n";

interface SolveTimerProps {
  /** The time solving started (ISO). If not set yet, count from 0 */
  startedAt: string | null;
}

/** Formats elapsed seconds as mm:ss (h:mm:ss past one hour) */
function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${pad(minutes)}:${pad(rest)}`;
}

export function SolveTimer({ startedAt }: SolveTimerProps) {
  const s = strings.screens.solve;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const base = startedAt ? new Date(startedAt).getTime() : now;
  const elapsed = formatElapsed((now - base) / 1000);

  return (
    <div className="solve-timer">
      <span className="solve-timer__label">{s.timerLabel}</span>
      <span className="solve-timer__value">{elapsed}</span>
      <span className="solve-timer__hint">{s.timerHint}</span>
    </div>
  );
}
