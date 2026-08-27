/*
 * ConnectStep — 풀이 1단계: 본인 AI 연결(BYOP)
 * ---------------------------------------------------------------------------
 * 예전에는 제공자 선택과 키 입력이 대화창 위에 얹혀 있었다. 처음 온 지원자에게는
 * 그게 "왜 내 키를 넣으라는 거지?"로 읽혀서, 설명을 붙일 자리를 따로 만들었다.
 * 이 단계가 하는 일은 셋이다 — 무엇을 보는 평가인지 밝히고, 그래서 본인 AI를
 * 쓰라고 권하고, 키가 어디에도 저장되지 않는다는 걸 약속한다.
 *
 * 건너뛸 수 있다. 다만 건너뛰면 대화를 시작할 수 없으므로, 그 사실을 숨기지 않고
 * 버튼 옆에 그대로 적는다.
 *
 * 비밀 경계: 이 컴포넌트는 키를 **상위로 올려 주기만** 하고 스스로 저장하지
 * 않는다. 저장·전송 정책은 SolveScreen 쪽 주석 참조.
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
  /** 연결하고 다음 단계로 */
  onContinue: () => void;
  /** 연결하지 않고 다음 단계로 */
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
        {/* 색 단독 금지(원칙 2) — 선택 결과를 항상 텍스트로 병행 */}
        <span className="provider-group__selected" role="status">
          {provider
            ? `${s.providerSelectedPrefix} ${strings.providers[provider]}`
            : s.providerNoneSelected}
        </span>

        {/* 제공자를 고른 뒤에만 키 입력 자리가 열린다 */}
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
