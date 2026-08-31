/*
 * StepNav — step indicator (navigation) component
 * ---------------------------------------------------------------------------
 * Spec: components/navigation/base.md
 * Placed in the app-shell header, always reflecting the current step. It
 * renders FLOW_STEPS (the single flow definition) as is, and expresses each
 * status (done/current/upcoming) redundantly through shape, number, label,
 * and screen-reader text (never color alone).
 * Style values depend only on the token classes in navigation.css.
 * ---------------------------------------------------------------------------
 */

import { FLOW_STEPS, stepStatus, type StepId } from "../flow";
import { strings } from "../i18n";

interface StepNavProps {
  /** Current step id */
  current: StepId;
}

const STATUS_TEXT = {
  done: strings.nav.statusDone,
  current: strings.nav.statusCurrent,
  upcoming: strings.nav.statusUpcoming,
} as const;

export function StepNav({ current }: StepNavProps) {
  const currentIdx = FLOW_STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label={strings.nav.ariaLabel}>
      <ol className="stepper">
        {FLOW_STEPS.map((step, idx) => {
          const status = stepStatus(idx, currentIdx);
          const isLast = idx === FLOW_STEPS.length - 1;
          const connectorStatus = idx < currentIdx ? "done" : "upcoming";
          return (
            <li key={step.id} style={{ display: "contents" }}>
              <div
                className={`stepper__item stepper__item--${status}`}
                aria-current={status === "current" ? "step" : undefined}
              >
                <span className="stepper__badge" aria-hidden="true">
                  {idx + 1}
                </span>
                <span className="stepper__label">{step.label}</span>
                {/* Never color alone — also provide the status as text (screen readers) */}
                <span className="stepper__status-sr">{STATUS_TEXT[status]}</span>
              </div>
              {!isLast && (
                <span
                  className={`stepper__connector stepper__connector--${connectorStatus}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
