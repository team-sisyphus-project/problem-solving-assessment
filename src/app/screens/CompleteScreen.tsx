/*
 * CompleteScreen — 흐름 4단계: 제출 완료 (종료 상태)
 * ---------------------------------------------------------------------------
 * 흐름의 종료 상태다(이후 전진 없음). 처음으로 돌아가는 동작만 제공한다.
 * ---------------------------------------------------------------------------
 */

import { useNavigate } from "react-router-dom";
import { FIRST_STEP_PATH } from "../flow";
import { strings } from "../strings";

export function CompleteScreen() {
  const navigate = useNavigate();
  const s = strings.screens.complete;

  return (
    <div className="flow-screen">
      <div className="empty-state">
        <h1 className="empty-state__title">{s.title}</h1>
        <p className="empty-state__description">{s.description}</p>
      </div>
      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => navigate(FIRST_STEP_PATH)}
        >
          {s.restartAction}
        </button>
      </div>
    </div>
  );
}
