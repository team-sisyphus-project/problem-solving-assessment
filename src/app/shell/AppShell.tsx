/*
 * AppShell — 레이아웃 셸 컴포넌트
 * ---------------------------------------------------------------------------
 * Spec: components/app-shell/base.md
 * 헤더(제품 식별 + 단계 표시자) + 메인 아웃렛(<Outlet/>) + 콘텐츠 컨테이너로
 * 구성된 최상위 프레임. 흐름 단계가 바뀌어도 변하지 않는 공통 골격이며, 메인
 * 아웃렛은 한 번에 한 단계만 렌더한다(원칙 3 — 화면당 초점 하나).
 *
 * 현재 단계는 라우트 경로에서 파생해 StepNav에 반영한다(화면 교체 시 자동 갱신).
 * 스타일 값은 app-shell.css의 토큰 클래스에만 의존한다.
 * ---------------------------------------------------------------------------
 */

import { Outlet, useLocation } from "react-router-dom";
import { FLOW_STEPS } from "../flow";
import { strings } from "../i18n";
import { StepNav } from "./StepNav";

export function AppShell() {
  const { pathname } = useLocation();

  // 현재 경로에 해당하는 흐름 단계. 매칭이 없으면 첫 단계로 간주(방어적).
  const currentStep =
    FLOW_STEPS.find((s) => s.path === pathname) ?? FLOW_STEPS[0];

  // 문제 풀이(채팅)만 넓은 콘텐츠 폭을 쓴다(app-shell base: md~lg).
  const isWide = currentStep.id === "solve";
  const containerClass = isWide
    ? "app-shell__container app-shell__container--wide"
    : "app-shell__container";

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span className="app-shell__product">{strings.app.productName}</span>
          <span className="app-shell__context">{strings.app.context}</span>
        </div>
        <StepNav current={currentStep.id} />
      </header>

      <main className="app-shell__main">
        <div className={containerClass}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
