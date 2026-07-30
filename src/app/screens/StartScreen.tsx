/*
 * StartScreen — 흐름 1단계: 시작·안내 (플레이스홀더)
 * ---------------------------------------------------------------------------
 * empty-state 프리미티브로 안내 골격만 구성하고, 주요 버튼으로 다음 단계로
 * 전환한다. 실제 응시 콘텐츠는 이번 골격 범위 밖.
 * ---------------------------------------------------------------------------
 */

import { useNavigate } from "react-router-dom";
import { nextStepPath } from "../flow";
import { strings } from "../strings";

export function StartScreen() {
  const navigate = useNavigate();
  const s = strings.screens.start;

  return (
    <div className="flow-screen">
      <div className="empty-state">
        <h1 className="empty-state__title">{s.title}</h1>
        <p className="empty-state__description">{s.description}</p>
      </div>
      <div className="flow-actions">
        <button
          type="button"
          className="btn"
          onClick={() => navigate(nextStepPath("start")!)}
        >
          {s.primaryAction}
        </button>
      </div>
    </div>
  );
}
