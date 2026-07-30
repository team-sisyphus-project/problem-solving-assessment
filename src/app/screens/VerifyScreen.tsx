/*
 * VerifyScreen — 흐름 1단계: 본인 확인 (플레이스홀더)
 * ---------------------------------------------------------------------------
 * 초대 링크(`/invite/:token`)로 진입한 지원자가 별도 회원가입/로그인 없이 최소
 * 정보(이름·이메일)로 본인을 확인하고 응시를 시작하는 자리. 이 grain은 흐름·
 * 라우팅 골격만 배선하므로 입력 폼은 후속 grain으로 미룬다 — 여기서는 empty-state
 * 안내 + 다음 단계(문제 안내)로 전진하는 주요 버튼만 둔다.
 *
 * 회원가입/로그인 단계는 존재하지 않는다(스펙: 계정 생성 없음).
 * ---------------------------------------------------------------------------
 */

import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath } from "../flow";
import { strings } from "../i18n";

export function VerifyScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.verify;

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
          onClick={() => navigate(nextStepPath(token, "verify")!)}
        >
          {s.primaryAction}
        </button>
      </div>
    </div>
  );
}
