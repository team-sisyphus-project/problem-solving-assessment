/*
 * 클라이언트 라우터 — 지원자 흐름 화면 전환 골격
 * ---------------------------------------------------------------------------
 * AppShell을 레이아웃으로 두고, 흐름 4단계를 자식 라우트로 배선한다. 메인
 * 아웃렛(<Outlet/>)에서 한 번에 한 화면만 교체 렌더된다.
 *
 * 딥링크 fallback 보장:
 *  - HashRouter를 써서 정적 배포(단일 index.html)에서도 `/#/solve` 같은 중첩
 *    경로 직접 진입이 항상 index.html을 로드한다(서버 fallback 설정 불요).
 *  - 알 수 없는 경로(`*`)와 루트(`/`)는 흐름 첫 단계로 replace 이동시켜, 잘못된
 *    딥링크가 빈 화면/404로 끊기지 않게 한다.
 * ---------------------------------------------------------------------------
 */

import {
  createHashRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { FIRST_STEP_PATH } from "./flow";
import { StartScreen } from "./screens/StartScreen";
import { ConnectScreen } from "./screens/ConnectScreen";
import { SolveScreen } from "./screens/SolveScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={FIRST_STEP_PATH} replace /> },
      { path: "start", element: <StartScreen /> },
      { path: "connect", element: <ConnectScreen /> },
      { path: "solve", element: <SolveScreen /> },
      { path: "complete", element: <CompleteScreen /> },
      // 딥링크 fallback — 알 수 없는 경로는 흐름 첫 단계로.
      { path: "*", element: <Navigate to={FIRST_STEP_PATH} replace /> },
    ],
  },
];

export const router = createHashRouter(routes);
