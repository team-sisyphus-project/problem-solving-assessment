/*
 * SolveScreen — 흐름 3단계: 문제 풀이 (플레이스홀더)
 * ---------------------------------------------------------------------------
 * 실제 대화형 문제 풀이(채팅)·문제·채점은 참조 화면 카드에서 완성한다. 여기서는
 * 넓은 콘텐츠 폭(app-shell container--wide)의 플레이스홀더 골격과 제출/이전
 * 전환만 배선한다.
 * ---------------------------------------------------------------------------
 */

import { useNavigate } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../strings";

export function SolveScreen() {
  const navigate = useNavigate();
  const s = strings.screens.solve;

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
          onClick={() => navigate(prevStepPath("solve")!)}
        >
          {s.backAction}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate(nextStepPath("solve")!)}
        >
          {s.primaryAction}
        </button>
      </div>
    </div>
  );
}
