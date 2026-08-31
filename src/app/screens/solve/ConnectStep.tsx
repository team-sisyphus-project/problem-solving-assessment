/*
 * ConnectStep — solve phase 1: connecting the candidate's own AI (BYOP)
 * ---------------------------------------------------------------------------
 * Previously, provider selection and key entry sat on top of the chat window.
 * To a first-time candidate that read as "why are they asking for my key?",
 * so a dedicated place for the explanation was made. This phase does three
 * things — states what this assessment looks at, recommends using one's own
 * AI for that reason, and promises that the key is never stored anywhere.
 *
 * It can be skipped. But skipping means the conversation cannot start, and
 * rather than hiding that fact we state it plainly next to the button.
 *
 * Secret boundary: this component only **lifts the key upward** and never
 * stores it itself. For the storage/transmission policy, see the comments in
 * SolveScreen.
 * ---------------------------------------------------------------------------
 */

import { strings } from "../../i18n";
import type { ProviderId } from "../../llm";

const PROVIDER_IDS = Object.keys(strings.providers) as ProviderId[];

interface ConnectStepProps {
  provider: ProviderId | null;
  apiKey: string;
  onProviderChange: (provider: ProviderId) => void;
  onApiKeyChange: (key: string) => void;
  /** Connect and move to the next phase */
  onContinue: () => void;
  /** Move to the next phase without connecting */
  onSkip: () => void;
}

export function ConnectStep({
  provider,
  apiKey,
  onProviderChange,
  onApiKeyChange,
  onContinue,
  onSkip,
}: ConnectStepProps) {
  const s = strings.screens.solve;
  const canContinue = provider !== null && apiKey.trim().length > 0;

  return (
    <div className="flow-panel solve-connect">
      <div className="solve-connect__intro">
        <span className="solve-phase-label">{s.phaseConnectLabel}</span>
        <h1 className="solve-connect__title">{s.phaseConnectTitle}</h1>
        <p className="solve-connect__lead">{s.phaseConnectLead}</p>
        <p className="solve-connect__body">{s.phaseConnectBody}</p>
        <p className="solve-connect__privacy">{s.phaseConnectPrivacy}</p>
      </div>

      <div
        className="provider-group"
        role="group"
        aria-label={s.providerLegend}
      >
        <span className="provider-group__legend">{s.providerLegend}</span>
        <span className="provider-group__hint">{s.providerHint}</span>
        <div className="provider-group__options">
          {PROVIDER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="btn btn--secondary"
              aria-pressed={provider === id}
              onClick={() => onProviderChange(id)}
            >
              {strings.providers[id]}
            </button>
          ))}
        </div>
        {/* Never color alone (principle 2) — always accompany the selection result with text */}
        <span className="provider-group__selected" role="status">
          {provider
            ? `${s.providerSelectedPrefix} ${strings.providers[provider]}`
            : s.providerNoneSelected}
        </span>

        {/* The key entry slot only opens after a provider is chosen */}
        <div className="provider-group__connect">
          <span className="provider-group__connect-title">
            {s.keyFieldTitle}
          </span>
          {provider ? (
            <div className="input-field">
              <label className="input-field__label" htmlFor="byop-key">
                {`${strings.providers[provider]} ${s.keyFieldLabel}`}
              </label>
              <input
                id="byop-key"
                className="input"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                placeholder={s.keyFieldPlaceholder}
                aria-describedby="byop-key-note"
                onChange={(e) => onApiKeyChange(e.target.value)}
              />
              <p className="input-field__helper" id="byop-key-note">
                {s.keyStorageNote}
              </p>
            </div>
          ) : (
            <p className="provider-group__connect-hint">{s.keyFieldHintNone}</p>
          )}
        </div>
      </div>

      <div className="solve-connect__actions">
        <div className="flow-actions flow-actions--start">
          <button
            type="button"
            className="btn"
            disabled={!canContinue}
            onClick={onContinue}
          >
            {s.phaseConnectAction}
          </button>
          <button
            type="button"
            className="btn btn--low-emphasis"
            onClick={onSkip}
          >
            {s.phaseSkipAction}
          </button>
        </div>
        <p className="solve-connect__skip-note">{s.phaseSkipNote}</p>
      </div>
    </div>
  );
}
