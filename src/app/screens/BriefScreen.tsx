/*
 * BriefScreen — 흐름 2단계: 문제 안내 (플레이스홀더)
 * ---------------------------------------------------------------------------
 * 본인 확인을 마친 지원자에게 배정된 문제 1건을 안내하는 자리. 배정 자체는
 * 세션 스토어(`getOrCreateSession`)가 토큰 첫 접근 시점에 확정한다(목업 조회).
 * 이 grain은 흐름·라우팅 골격만 배선하므로 문제 상세 표시는 후속 grain으로
 * 미룬다 — 여기서는 empty-state 안내 + 이전/풀이 시작 액션만 둔다.
 * ---------------------------------------------------------------------------
 */

import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../i18n";

export function BriefScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.brief;

  return (
    <div className="flow-screen">
      <div className="empty-state">
        <h1 className="empty-state__title">{s.title}</h1>
        <p className="empty-state__description">{s.description}</p>
      </div>
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
