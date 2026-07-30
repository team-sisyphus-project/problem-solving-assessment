/*
 * ConnectScreen — 흐름 2단계: LLM 연결·선택 (플레이스홀더)
 * ---------------------------------------------------------------------------
 * M-5: GPT/Claude/Gemini 중 하나를 선택하는 UI 자리를 제공한다. BYOP 구조상
 * 실제 키 연동 로직은 이번 골격 범위 밖 — 여기서는 "선택 UI + 연결 자리"까지만
 * 배선한다. 선택 전에는 계속 버튼을 비활성화한다.
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../strings";

type ProviderId = keyof typeof strings.providers;

const PROVIDER_IDS = Object.keys(strings.providers) as ProviderId[];

export function ConnectScreen() {
  const navigate = useNavigate();
  const s = strings.screens.connect;
  const [selected, setSelected] = useState<ProviderId | null>(null);

  return (
    <div className="flow-screen">
      <div className="empty-state">
        <h1 className="empty-state__title">{s.title}</h1>
        <p className="empty-state__description">{s.description}</p>
      </div>

      <div className="provider-group" role="group" aria-label={s.providerLegend}>
        <span className="provider-group__legend">{s.providerLegend}</span>
        <span className="provider-group__hint">{s.providerHint}</span>
        <div className="provider-group__options">
          {PROVIDER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="btn btn--secondary"
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
            >
              {strings.providers[id]}
            </button>
          ))}
        </div>
        <span className="provider-group__selected">
          {selected
            ? `${s.selectedPrefix} ${strings.providers[selected]}`
            : s.noneSelected}
        </span>
      </div>

      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--low-emphasis"
          onClick={() => navigate(prevStepPath("connect")!)}
        >
          {s.backAction}
        </button>
        <button
          type="button"
          className="btn"
          disabled={selected === null}
          onClick={() => navigate(nextStepPath("connect")!)}
        >
          {s.primaryAction}
        </button>
      </div>
    </div>
  );
}
