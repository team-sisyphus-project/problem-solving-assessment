/*
 * BriefScreen — flow step 2: problem brief (`/invite/:token/brief`)
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/problem-brief/base.md  (a card presenting the single assigned problem with proper hierarchy)
 *   foundations/i18n-strings.md       (screens.brief namespace)
 *
 * Presents the title and description of the **single assigned problem** to
 * the candidate who has completed identity verification, following the visual
 * hierarchy (eyebrow → title → description) (SC-2/M-2). The assignment itself
 * is fixed deterministically by the session store at the first access to the
 * token (`getOrCreateSession` → `assignProblem`), and this screen renders
 * only the **single problem** that session holds (`session.problem`). Other
 * candidates' problems are outside the token scope, so there is no access
 * path to them at all (non-exposure guaranteed).
 *
 * The problem title/description is domain data (session/problems); only the
 * screen chrome (eyebrow, guide, actions) is managed via i18n keys
 * (screens.brief). Zero hardcoded styles — every visual detail depends on the
 * primitives (.problem-brief/.btn) and the token classes in screens.css.
 * ---------------------------------------------------------------------------
 */

import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../i18n";
import { getOrCreateSession } from "../session/store";

const PROBLEM_TITLE_ID = "brief-problem-title";

export function BriefScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.brief;

  // The token session is the source of the assigned problem — here we only
  // read and display that single assignment (M-2).
  const { problem } = getOrCreateSession(token);

  return (
    <div className="flow-screen">
      <article className="problem-brief" aria-labelledby={PROBLEM_TITLE_ID}>
        <p className="problem-brief__eyebrow">{s.assignedLabel}</p>
        <h1 id={PROBLEM_TITLE_ID} className="problem-brief__title">
          {problem.title}
        </h1>
        <p className="problem-brief__description">{problem.description}</p>
        <p className="problem-brief__guide">{s.guide}</p>
      </article>

      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--low-emphasis"
          onClick={() => navigate(prevStepPath(token, "brief")!)}
        >
          {s.backAction}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate(nextStepPath(token, "brief")!)}
        >
          {s.primaryAction}
        </button>
      </div>
    </div>
  );
}
