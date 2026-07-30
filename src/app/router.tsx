/*
 * 클라이언트 라우터 — 지원자 흐름 화면 전환 골격 (초대 토큰 스코프)
 * ---------------------------------------------------------------------------
 * 모든 응시 흐름은 초대 링크 `/invite/:token` 아래에 중첩된다. AppShell을
 * 레이아웃으로 두고, 흐름 4단계(본인 확인=인덱스 · 문제 안내 · 문제 풀이 ·
 * 제출 완료)를 자식 라우트로 배선한다. 메인 아웃렛(<Outlet/>)에서 한 번에 한
 * 화면만 교체 렌더된다.
 *
 * 딥링크 fallback 보장:
 *  - HashRouter를 써서 정적 배포(단일 index.html)에서도 `/#/invite/{token}/solve`
 *    같은 중첩 경로 직접 진입이 항상 index.html을 로드한다(서버 fallback 불요).
 *  - 토큰 내부의 알 수 없는 하위 경로는 해당 토큰의 첫 단계(본인 확인)로 replace.
 *  - 토큰이 없는 루트(`/`)·완전히 알 수 없는 경로는 미리보기가 끊기지 않도록
 *    데모 토큰 초대 링크로 replace 이동시킨다(실서비스 진입은 발급된 토큰 링크).
 * ---------------------------------------------------------------------------
 */

import {
  createHashRouter,
  Navigate,
  useParams,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { firstStepPath } from "./flow";
import { DEMO_TOKEN } from "./session/store";
import { VerifyScreen } from "./screens/VerifyScreen";
import { BriefScreen } from "./screens/BriefScreen";
import { SolveScreen } from "./screens/SolveScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

const demoInvitePath = firstStepPath(DEMO_TOKEN);

/** 토큰 내부의 알 수 없는 하위 경로 → 해당 토큰의 첫 단계로 */
function InviteFallback() {
  const { token } = useParams();
  return (
    <Navigate to={token ? firstStepPath(token) : demoInvitePath} replace />
  );
}

const routes: RouteObject[] = [
  {
    path: "/invite/:token",
    element: <AppShell />,
    children: [
      { index: true, element: <VerifyScreen /> },
      { path: "brief", element: <BriefScreen /> },
      { path: "solve", element: <SolveScreen /> },
      { path: "complete", element: <CompleteScreen /> },
      // 토큰 내부 딥링크 fallback — 알 수 없는 하위 경로는 첫 단계로.
      { path: "*", element: <InviteFallback /> },
    ],
  },
  // 토큰 없는 진입은 데모 토큰 초대 링크로(미리보기 연속성).
  { index: true, path: "/", element: <Navigate to={demoInvitePath} replace /> },
  { path: "*", element: <Navigate to={demoInvitePath} replace /> },
];

export const router = createHashRouter(routes);
