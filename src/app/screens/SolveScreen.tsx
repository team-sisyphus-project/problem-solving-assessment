/*
 * SolveScreen — 흐름 3단계: 문제 풀이(채팅) 참조 화면
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/conversation/base.md      (상단 = 제공자 선택 슬롯 — 개정)
 *   components/provider-group/base.md    (선택지·선택 상태·연결 자리)
 *   components/message-bubble/{base,applicant}.md
 *   components/composer/base.md
 *
 * 골격(스캐폴딩)의 "참조 화면 1개 완주" — 지원자용 문제 풀이(채팅) 화면을
 * 프리미티브·토큰만으로 완성한다(M-1/M-4). 화면 구성:
 *   상단 제공자 선택 슬롯(M-5, provider-group 임베드) + 연결 자리(BYOP
 *   placeholder) + 메시지 스택(빈 상태/버블/대기) + 하단 composer.
 *
 * M-5: 참조 화면 **안에서** GPT/Claude/Gemini 중 하나를 로컬 state로 선택하고,
 * 선택된 제공자가 곧 현재 응답 AI로 반영된다(작성자 라벨·연결 자리 문구).
 * "연결 자리"는 실제 키 연동 UI가 들어올 예약 자리일 뿐 — 실제 키/서버 로직은
 * 범위 밖이다(BYOP 구조 전제, 세부 연동은 이후 grain).
 *
 * 개별 하드코딩 스타일 0 — 모든 시각 표현은 chat.css/프리미티브의 토큰
 * 클래스에만 의존한다. 여기서는 마크업·로컬 상태만 다룬다.
 * ---------------------------------------------------------------------------
 */

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../strings";

type MessageRole = "applicant" | "ai";

interface ChatMessage {
  id: number;
  role: MessageRole;
  text: string;
}

type ProviderId = keyof typeof strings.providers;

const PROVIDER_IDS = Object.keys(strings.providers) as ProviderId[];

export function SolveScreen() {
  const navigate = useNavigate();
  const s = strings.screens.solve;

  // 활성 AI 제공자(M-5) — 참조 화면 안에서 직접 선택. 선택 전에는 무채색 유지
  // (provider-group 원칙 2), 선택된 하나만 accent로 승격(원칙 3).
  const [provider, setProvider] = useState<ProviderId | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  // 메시지 id 시퀀스 — 렌더 순수성 유지를 위해 ref 카운터로 발급.
  const seq = useRef(0);
  const nextId = () => (seq.current += 1);
  // stub 응답 타이머 — 언마운트 시 정리.
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 전송은 제공자 선택 + 입력이 모두 있을 때만(응답 AI가 정해져야 대화 가능).
  const canSend = provider !== null && draft.trim().length > 0 && !pending;
  // 선택된 제공자가 곧 응답 AI — 작성자 라벨에 반영(미선택 시 일반 라벨).
  const aiAuthor = provider ? strings.providers[provider] : s.authorAi;

  function handleSend() {
    const text = draft.trim();
    if (!text || pending || provider === null) return;

    setMessages((prev) => [...prev, { id: nextId(), role: "applicant", text }]);
    setDraft("");
    setPending(true);

    // stub: 잠시 뒤 AI 응답 버블을 추가하고 대기 표시를 해제(로컬 시연).
    replyTimer.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "ai", text: s.stubReply },
      ]);
      setPending(false);
    }, 700);
  }

  return (
    <div className="flow-screen">
      <section className="conversation" aria-label={s.title}>
        {/* 제공자 선택 슬롯(M-5) — provider-group 임베드. 선택 UI + 연결 자리. */}
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
                onClick={() => setProvider(id)}
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

          {/* 연결 자리(BYOP placeholder) — 실제 키 연동 UI가 들어올 예약 자리.
              지금은 안내만 담은 비활성 자리(accent·status 미사용). */}
          <div className="provider-group__connect" aria-disabled="true">
            <span className="provider-group__connect-title">
              {s.connectSlotTitle}
            </span>
            <p className="provider-group__connect-hint">
              {provider
                ? `${strings.providers[provider]} ${s.connectSlotHintSuffix}`
                : s.connectSlotHintNone}
            </p>
          </div>
        </div>

        <div className="conversation__list">
          {messages.length === 0 && !pending ? (
            <div className="empty-state">
              <h1 className="empty-state__title">{s.emptyTitle}</h1>
              <p className="empty-state__description">{s.emptyDescription}</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "applicant"
                    ? "message-bubble message-bubble--applicant"
                    : "message-bubble"
                }
              >
                <span className="message-bubble__author">
                  {m.role === "applicant" ? s.authorApplicant : aiAuthor}
                </span>
                <p className="message-bubble__body">{m.text}</p>
              </div>
            ))
          )}

          {pending && (
            <div className="loading conversation__pending" role="status">
              <span className="spinner" aria-hidden="true" />
              <span className="loading__text">{s.pendingText}</span>
            </div>
          )}
        </div>
      </section>

      {/* composer — 입력(.input) + 전송(.btn) 묶음 */}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <div className="composer__row">
          <textarea
            className="input composer__field"
            rows={2}
            placeholder={s.composerPlaceholder}
            aria-label={s.composerPlaceholder}
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn" disabled={!canSend}>
            {s.sendAction}
          </button>
        </div>
        <p className="composer__hint">
          {provider === null ? s.composerHintNoProvider : s.composerHint}
        </p>
      </form>

      <div className="flow-actions">
        <button
          type="button"
          className="btn btn--low-emphasis"
          onClick={() => navigate(prevStepPath("solve")!)}
        >
          {s.backAction}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate(nextStepPath("solve")!)}
        >
          {s.primaryAction}
        </button>
      </div>
    </div>
  );
}
