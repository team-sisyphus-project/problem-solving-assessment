/*
 * StepNav — 단계 표시자(navigation) 컴포넌트
 * ---------------------------------------------------------------------------
 * Spec: components/navigation/base.md
 * app-shell 헤더에 배치되어 현재 단계를 항상 반영한다. FLOW_STEPS(단일 흐름
 * 정의)를 그대로 렌더하며, 상태(완료/현재/예정)를 형태·번호·레이블·스크린리더
 * 텍스트로 병행 표현한다(색 단독 금지).
 * 스타일 값은 navigation.css의 토큰 클래스에만 의존한다.
 * ---------------------------------------------------------------------------
 */

import { FLOW_STEPS, stepStatus, type StepId } from "../flow";
import { strings } from "../i18n";

interface StepNavProps {
  /** 현재 단계 id */
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
                {/* 색 단독 금지 — 상태를 텍스트로도 제공(스크린리더) */}
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
