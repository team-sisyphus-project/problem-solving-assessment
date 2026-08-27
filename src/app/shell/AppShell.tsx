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
 *
 * 배경은 웰컴 인트로와 같은 하늘 그림을 잔잔한 변형(calm)으로 깐다. 인트로에서
 * 흐름으로 넘어갈 때 세계가 바뀌지 않게 하되, 화면 아래쪽에만 옅게 스미도록 해
 * 폼·대화의 가독성은 그대로 지킨다. 브랜드 마크도 인트로와 같은 것을 쓴다.
 *
 * 제출 후 재진입(SC-4/M-5 개정): 토큰이 이미 제출됨이면, 흐름의 어느 단계로
 * 딥링크/재진입해도(본인 확인·문제 안내·문제 풀이) 자식 화면 대신 **지난 제출
 * 안내**(PreviousSubmission)를 렌더한다. 예전에는 여기서 흐름을 잠갔지만, 무엇을
 * 냈는지조차 못 보고 막히는 화면이었다. 지금은 지난 제출을 읽어 보거나, 그대로
 * 두고 새 문제로 다시 시작할지 **묻는다** — 어느 쪽이든 지난 제출은 지워지지
 * 않는다(store의 history로 옮겨 둔다).
 *
 * 유일한 예외는 제출 직후 목적지인 제출 완료(complete)로, 여기서만 자식 화면
 * (<Outlet/>)이 그대로 도달한다. 가드를 개별 화면이 아니라 셸 계층에 두어 흐름
 * 전체에 일괄 적용하는 구조는 그대로다.
 * ---------------------------------------------------------------------------
 */

import { Outlet, useLocation, useParams } from "react-router-dom";
import { FLOW_STEPS, INVITE_BASE, stepIdFromSegment, welcomePath } from "../flow";
import { strings } from "../i18n";
import { getOrCreateSession } from "../session/store";
import { PreviousSubmission } from "../screens/PreviousSubmission";
import { SkyBackdrop } from "../screens/welcome/SkyBackdrop";
import { BrandMark } from "./BrandMark";
import { StepNav } from "./StepNav";

export function AppShell() {
  const { pathname } = useLocation();
  const { token = "" } = useParams();

  // 토큰 첫 접근 시점에 세션을 확보(배정 문제 고정 등). 이후 화면들이 재사용.
  const session = getOrCreateSession(token);

  // 현재 경로 조각(토큰 베이스 이후)에서 흐름 단계를 파생. 매칭 없으면 첫 단계.
  const base = `${INVITE_BASE}/${token}`;
  const segment = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const currentStepId = stepIdFromSegment(segment);
  const currentStep =
    FLOW_STEPS.find((s) => s.id === currentStepId) ?? FLOW_STEPS[0];

  // 제출 후 재진입 — 제출됨이면 완료(complete)를 제외한 모든 단계에서 자식 화면
  // 대신 지난 제출 안내를 렌더한다. 완료는 제출 직후 목적지라 예외.
  const showPrevious =
    currentStep.id !== "complete" && session.submittedAt != null;

  // 2단 레이아웃을 쓰는 단계(본인 확인·문제 풀이)만 넓은 콘텐츠 폭을 쓴다
  // (app-shell base: md~lg). 잠금 안내는 좁은 폭을 유지한다(다른 empty-state
  // 화면과 동일).
  const isWide =
    !showPrevious &&
    (currentStep.id === "solve" || currentStep.id === "verify");
  const containerClass = isWide
    ? "app-shell__container app-shell__container--wide"
    : "app-shell__container";

  return (
    <div className="app-shell">
      {/* 웰컴 인트로와 같은 하늘을 잔잔한 버전으로 — 흐름 전체의 배경 통일 */}
      <SkyBackdrop variant="calm" className="app-shell__backdrop" />

      <header className="app-shell__header">
        <div className="app-shell__brand">
          {/* 마크를 누르면 처음(웰컴)으로 — 제출을 마쳤어도 막지 않는다 */}
          <BrandMark tone="on-surface" to={welcomePath(token)} />
          <span className="app-shell__context">{strings.app.context}</span>
        </div>
        <StepNav current={currentStep.id} />
      </header>

      <main className="app-shell__main">
        <div className={containerClass}>
          {showPrevious ? (
            <PreviousSubmission session={session} />
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
