/*
 * 클라이언트 라우터 — 웰컴 인트로 + 지원자 흐름 화면 전환 골격 (초대 토큰 스코프)
 * ---------------------------------------------------------------------------
 * 모든 응시 경로는 초대 링크 `/invite/:token` 아래에 중첩된다. 토큰 스코프는
 * 두 층으로 나뉜다.
 *
 *   1) 토큰 인덱스(`/invite/:token`) = 웰컴 인트로 — 셸(AppShell) **밖**에서
 *      전면(full-bleed) 히어로로 렌더된다. 단계 표시자·콘텐츠 컨테이너 같은
 *      셸 골격을 쓰지 않기 때문이다(인트로는 흐름 단계가 아니다).
 *   2) 그 아래 하위 경로 = 기존 흐름 4단계 — pathless 레이아웃 라우트로 묶어
 *      AppShell을 씌우고, 메인 아웃렛(<Outlet/>)에서 한 번에 한 화면만 교체
 *      렌더한다. 4단계 구조(본인 확인 · 문제 안내 · 문제 풀이 · 제출 완료)와
 *      셸 계층의 제출 후 잠금 가드는 그대로다.
 *
 * 딥링크 fallback 보장:
 *  - HashRouter를 써서 정적 배포(단일 index.html)에서도 `/#/invite/{token}/solve`
 *    같은 중첩 경로 직접 진입이 항상 index.html을 로드한다(서버 fallback 불요).
 *  - 토큰 내부의 알 수 없는 하위 경로는 해당 토큰의 첫 단계(본인 확인)로 replace.
 *    인트로가 아니라 첫 단계로 보낸다 — 흐름 중간 딥링크를 인트로로 되돌리면
 *    이미 시작한 응시가 처음으로 튕기기 때문이다.
 *  - 토큰이 없는 루트(`/`)·완전히 알 수 없는 경로는 미리보기가 끊기지 않도록
 *    데모 토큰의 **인트로**로 replace 이동시킨다(첫 진입과 동일한 경험).
 * ---------------------------------------------------------------------------
 */

import {
  createHashRouter,
  Navigate,
  useParams,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { firstStepPath, welcomePath } from "./flow";
import { DEMO_TOKEN } from "./session/store";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { VerifyScreen } from "./screens/VerifyScreen";
import { BriefScreen } from "./screens/BriefScreen";
import { SolveScreen } from "./screens/SolveScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

const demoWelcomePath = welcomePath(DEMO_TOKEN);

/** 토큰 내부의 알 수 없는 하위 경로 → 해당 토큰의 첫 단계로 */
function InviteFallback() {
  const { token } = useParams();
  return (
    <Navigate to={token ? firstStepPath(token) : demoWelcomePath} replace />
  );
}

const routes: RouteObject[] = [
  {
    path: "/invite/:token",
    children: [
      // 흐름 앞단 — 셸 밖 전면 히어로(단계 표시자 없음).
      { index: true, element: <WelcomeScreen /> },
      // 흐름 4단계 — pathless 레이아웃 라우트로 셸을 씌운다.
      {
        element: <AppShell />,
        children: [
          { path: "verify", element: <VerifyScreen /> },
          { path: "brief", element: <BriefScreen /> },
          { path: "solve", element: <SolveScreen /> },
          { path: "complete", element: <CompleteScreen /> },
          // 토큰 내부 딥링크 fallback — 알 수 없는 하위 경로는 첫 단계로.
          { path: "*", element: <InviteFallback /> },
        ],
      },
    ],
  },
  // 토큰 없는 진입은 데모 토큰의 인트로로(미리보기 연속성).
  { index: true, path: "/", element: <Navigate to={demoWelcomePath} replace /> },
  { path: "*", element: <Navigate to={demoWelcomePath} replace /> },
];

export const router = createHashRouter(routes);
