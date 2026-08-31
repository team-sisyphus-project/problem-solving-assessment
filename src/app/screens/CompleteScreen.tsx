/*
 * CompleteScreen — flow step 4: submission complete (terminal state)
 * ---------------------------------------------------------------------------
 * The terminal state of the flow (no forward progression afterward). Only a
 * return-to-start action is provided.
 * ---------------------------------------------------------------------------
 */

import { useNavigate, useParams } from "react-router-dom";
import { firstStepPath } from "../flow";
import { strings } from "../i18n";

export function CompleteScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.complete;

  return (
    <div className="flow-screen">
      <div className="flow-panel">
        <div className="empty-state">
          <h1 className="empty-state__title">{s.title}</h1>
          <p className="empty-state__description">{s.description}</p>
        </div>
      </div>
      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => navigate(firstStepPath(token))}
        >
          {s.restartAction}
        </button>
      </div>
    </div>
  );
}
