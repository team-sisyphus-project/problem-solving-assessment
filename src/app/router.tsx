/*
 * Client router — welcome intro + candidate flow screen-transition skeleton (invite-token scope)
 * ---------------------------------------------------------------------------
 * Every assessment path is nested under the invite link `/invite/:token`. The
 * token scope splits into two layers.
 *
 *   1) Token index (`/invite/:token`) = welcome intro — rendered as a
 *      full-bleed hero **outside** the shell (AppShell), because it uses none
 *      of the shell skeleton such as the step indicator or content container
 *      (the intro is not a flow step).
 *   2) The sub-paths below it = the existing 4-step flow — wrapped in a
 *      pathless layout route that applies AppShell, with the main outlet
 *      (<Outlet/>) swapping in exactly one screen at a time. The 4-step
 *      structure (identity verification · problem brief · problem solving ·
 *      submission complete) and the shell-level post-submission lock guard
 *      are unchanged.
 *
 * Deep-link fallback guarantees:
 *  - HashRouter is used so that even on a static deployment (single
 *    index.html), directly entering a nested path like
 *    `/#/invite/{token}/solve` always loads index.html (no server fallback
 *    needed).
 *  - Unknown sub-paths inside a token replace-navigate to that token's first
 *    step (identity verification). We send them to the first step, not the
 *    intro — bouncing a mid-flow deep link back to the intro would throw an
 *    already-started assessment back to the beginning.
 *  - The tokenless root (`/`) and completely unknown paths replace-navigate
 *    to the demo token's **intro** so previews are never broken (the same
 *    experience as a first entry).
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

/** Unknown sub-path inside a token → that token's first step */
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
      // Ahead of the flow — full-bleed hero outside the shell (no step indicator).
      { index: true, element: <WelcomeScreen /> },
      // The 4 flow steps — wrapped in the shell via a pathless layout route.
      {
        element: <AppShell />,
        children: [
          { path: "verify", element: <VerifyScreen /> },
          { path: "brief", element: <BriefScreen /> },
          { path: "solve", element: <SolveScreen /> },
          { path: "complete", element: <CompleteScreen /> },
          // Deep-link fallback inside a token — unknown sub-paths go to the first step.
          { path: "*", element: <InviteFallback /> },
        ],
      },
    ],
  },
  // Tokenless entries go to the demo token's intro (preview continuity).
  { index: true, path: "/", element: <Navigate to={demoWelcomePath} replace /> },
  { path: "*", element: <Navigate to={demoWelcomePath} replace /> },
];

export const router = createHashRouter(routes);
