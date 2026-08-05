/*
 * BriefScreen — 흐름 2단계: 문제 안내 (`/invite/:token/brief`)
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/problem-brief/base.md  (배정 문제 1건을 위계에 맞춰 제시하는 카드)
 *   foundations/i18n-strings.md       (screens.brief 네임스페이스)
 *
 * 본인 확인을 마친 지원자에게 **배정된 문제 1건**의 제목·설명을 시각 위계
 * (eyebrow→제목→설명)에 맞춰 안내한다(SC-2/M-2). 배정 자체는 세션 스토어가
 * 토큰 첫 접근 시점에 결정적으로 확정하며(`getOrCreateSession`→`assignProblem`),
 * 이 화면은 그 세션이 보관한 **단 1건**(`session.problem`)만 렌더한다. 다른
 * 지원자의 문제는 토큰 스코프 밖이라 접근 경로 자체가 없다(미노출 보장).
 *
 * 문제 제목/설명은 도메인 데이터(session/problems)이고, 화면 크롬(eyebrow·안내·
 * 액션)만 i18n 키(screens.brief)로 관리한다. 하드코딩 스타일 0 — 모든 시각
 * 표현은 프리미티브(.problem-brief/.btn)와 screens.css의 토큰 클래스에 의존한다.
 * ---------------------------------------------------------------------------
 */

import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../i18n";
import { getOrCreateSession } from "../session/store";

const PROBLEM_TITLE_ID = "brief-problem-title";

export function BriefScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.brief;

  // 토큰 세션이 배정 문제의 원본 — 여기서는 배정된 1건만 읽어 표시한다(M-2).
  const { problem } = getOrCreateSession(token);

  return (
    <div className="flow-screen">
      <article className="problem-brief" aria-labelledby={PROBLEM_TITLE_ID}>
        <p className="problem-brief__eyebrow">{s.assignedLabel}</p>
        <h1 id={PROBLEM_TITLE_ID} className="problem-brief__title">
          {problem.title}
        </h1>
        <p className="problem-brief__description">{problem.description}</p>
        <p className="problem-brief__guide">{s.guide}</p>
      </article>

      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--low-emphasis"
          onClick={() => navigate(prevStepPath(token, "brief")!)}
        >
          {s.backAction}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate(nextStepPath(token, "brief")!)}
        >
          {s.primaryAction}
        </button>
      </div>
    </div>
  );
}
