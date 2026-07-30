/*
 * SolveScreen — 흐름 3단계: 문제 풀이(채팅) 참조 화면
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/conversation/base.md
 *   components/message-bubble/{base,applicant}.md
 *   components/composer/base.md
 *
 * 골격(스캐폴딩)의 "참조 화면 1개 완주" — 지원자용 문제 풀이(채팅) 화면을
 * 프리미티브·토큰만으로 실제로 완성해 본보기로 삼는다(M-1/M-4). 화면 구성:
 *   상단 활성 제공자 표시(M-5, 읽기 전용) + 메시지 스택(빈 상태/버블/대기) +
 *   하단 composer(입력 .input + 전송 .btn).
 *
 * 로컬 상태만으로 전송→지원자 버블 추가→응답 대기(loading)→stub 응답 버블
 * 추가의 흐름을 시연한다. 실제 LLM 키 연동·서버·채점은 범위 밖이다.
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

/**
 * 활성 AI 제공자(M-5) — 연결 단계(Connect)의 선택 결과를 읽기 전용으로 반영한다.
 * 화면 간 상태 공유는 이번 grain 범위 밖이라, 여기서는 기본 제공자를 상시
 * 표시한다(이 화면에서 제공자를 바꾸지 않는다 — 전환 UI는 Connect의 몫).
 */
const ACTIVE_PROVIDER: keyof typeof strings.providers = "claude";

export function SolveScreen() {
  const navigate = useNavigate();
  const s = strings.screens.solve;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  // 메시지 id 시퀀스 — 렌더 순수성 유지를 위해 ref 카운터로 발급.
  const seq = useRef(0);
  const nextId = () => (seq.current += 1);
  // stub 응답 타이머 — 언마운트 시 정리.
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSend = draft.trim().length > 0 && !pending;

  function handleSend() {
    const text = draft.trim();
    if (!text || pending) return;

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
        {/* 활성 AI 제공자 표시(M-5) — 무채색·저강조 상시 상태, 제공자명 텍스트 병행 */}
        <div className="conversation__provider" role="status">
          <span className="conversation__provider-label">
            {s.activeProviderLabel}:
          </span>
          <span className="conversation__provider-value">
            {strings.providers[ACTIVE_PROVIDER]}
          </span>
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
                  {m.role === "applicant" ? s.authorApplicant : s.authorAi}
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
        <p className="composer__hint">{s.composerHint}</p>
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
