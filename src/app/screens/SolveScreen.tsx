/*
 * SolveScreen — 흐름 3단계: 문제 풀이(채팅) 참조 화면
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/conversation/base.md      (상단 = 제공자 선택 슬롯 — 개정)
 *   components/provider-group/base.md    (선택지·선택 상태·연결 자리)
 *   components/message-bubble/{base,applicant}.md
 *   components/composer/base.md
 *   components/modal/base.md               (제출 확인 모달 — grain-4)
 *
 * 풀이는 화면 **안에서 두 단계**로 나뉜다(흐름 4단계·단계 표시자는 그대로다).
 *
 *   1단계 connect — 무엇을 보는 평가인지 설명하고, 본인 AI를 연결한다(BYOP).
 *                   건너뛸 수 있지만, 건너뛰면 대화를 시작할 수 없다.
 *   2단계 chat    — 좌: 경과 시간 + 흘러가는 구름 / 우: 고정된 문제 + 대화.
 *
 * 예전에는 제공자 선택·키 입력이 대화창 위에 얹혀 있어서, 처음 온 지원자가
 * "왜 내 키를 넣지?"를 물을 자리가 없었다. 단계를 나눈 이유가 그것이다.
 *
 * 이미 대화가 있는 세션으로 되돌아오면 1단계를 건너뛰고 바로 대화로 간다 —
 * 진행 중이던 사람에게 연결 화면을 다시 들이밀지 않는다.
 *
 * M-5: GPT/Claude/Gemini 중 하나를 로컬 state로 선택하고, 선택된 제공자가 곧
 * 현재 응답 AI로 반영된다(작성자 라벨·키 필드 라벨).
 *
 * BYOP: 지원자가 선택한 제공자의 본인 API 키를 화면에서 직접 입력한다. 키는
 * 브라우저 세션 메모리(로컬 state)에만 존재하며 서버·localStorage·세션 스토어·
 * 대화 로그 어디에도 저장·로그하지 않는다(비밀값). 전송마다 grain-1의
 * sendChat(provider, key, messages)로 실제 LLM을 호출하고, 응답을 세션 로그에
 * 순서대로 누적한다(이전 대화 유지·빈 상태 보존). 실패는 toast(error)로 안내.
 *
 * 개별 하드코딩 스타일 0 — 모든 시각 표현은 chat.css/프리미티브의 토큰
 * 클래스에만 의존한다. 여기서는 마크업·로컬 상태만 다룬다.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../i18n";
import {
  LlmError,
  sendChat,
  type ChatMessage as LlmChatMessage,
  type ProviderId,
} from "../llm";
import {
  appendMessage,
  getOrCreateSession,
  markStarted,
  markSubmitted,
  type ChatMessage,
  type MessageRole,
} from "../session/store";
import { ConnectStep } from "./solve/ConnectStep";
import { DriftingClouds } from "./solve/DriftingClouds";
import { ProblemPin } from "./solve/ProblemPin";
import { SolveTimer } from "./solve/SolveTimer";

/** 풀이 화면 안의 하위 단계 */
type SolvePhase = "connect" | "chat";

/** 세션 스토어 역할(applicant/ai) → 어댑터 역할(user/assistant) 매핑.
 * 비밀 경계: apiKey는 이 변환에 개입하지 않는다(메시지 로그에 키 없음). */
function toAdapterRole(role: MessageRole): LlmChatMessage["role"] {
  return role === "applicant" ? "user" : "assistant";
}

/** 세션 로그를 어댑터 입력(user로 시작해 교대)으로 변환한다. */
function toAdapterMessages(log: ChatMessage[]): LlmChatMessage[] {
  return log.map((m) => ({ role: toAdapterRole(m.role), content: m.text }));
}

export function SolveScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.solve;

  // 활성 AI 제공자(M-5) — 참조 화면 안에서 직접 선택. 선택 전에는 무채색 유지
  // (provider-group 원칙 2), 선택된 하나만 accent로 승격(원칙 3).
  const [provider, setProvider] = useState<ProviderId | null>(null);

  // 대화 로그는 토큰 세션 스토어가 원본(source of truth) — 진입 시 기존 로그를
  // 불러오고, 전송마다 스토어에 append 후 화면 상태를 동기화한다(토큰별 영속).
  const session = getOrCreateSession(token);
  const [messages, setMessages] = useState<ChatMessage[]>(session.messages);

  // 하위 단계 — 이미 대화가 시작된 세션이면 연결 화면을 건너뛴다.
  const [phase, setPhase] = useState<SolvePhase>(
    session.messages.length > 0 ? "chat" : "connect",
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  // 본인 API 키(BYOP) — 브라우저 세션 메모리(로컬 state)에만 보관한다. 서버·
  // localStorage·세션 스토어·대화 로그 어디에도 저장하지 않는다(비밀값).
  const [apiKey, setApiKey] = useState("");

  // LLM 호출 실패 안내 — 실패 시 toast(error)로 노출, 다음 전송 시 초기화.
  const [error, setError] = useState<string | null>(null);

  // 제출 확인 모달 열림 상태(M-4·M-5) — "제출하기"는 즉시 제출하지 않고 이
  // 모달을 띄운다. "최종 제출" 확정 시에만 잠금이 성립한다.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 언마운트 이후 상태 갱신을 막기 위한 마운트 플래그(진행 중 호출 정리).
  const mountedRef = useRef(true);
  // 모달의 확정(주요) 액션 — 열릴 때 초점을 이 버튼으로 옮긴다.
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const hasKey = apiKey.trim().length > 0;
  // 전송은 제공자 선택 + 키 입력 + 본문이 모두 있고 대기 중이 아닐 때만.
  const canSend =
    provider !== null && hasKey && draft.trim().length > 0 && !pending;
  // 선택된 제공자가 곧 응답 AI — 작성자 라벨에 반영(미선택 시 일반 라벨).
  const aiAuthor = provider ? strings.providers[provider] : s.authorAi;

  async function handleSend() {
    const text = draft.trim();
    if (!text || pending || provider === null || !hasKey) return;

    // 지원자 발화를 스토어에 기록(순서·시각 포함) 후 화면 동기화.
    const afterUser = appendMessage(token, "applicant", text).messages;
    setMessages(afterUser);
    setDraft("");
    setPending(true);
    setError(null);

    // 선택된 제공자·본인 키로 실제 LLM 호출. apiKey는 인자로만 흐르고(요청
    // 헤더에서만 소비) 메시지 로그·저장 세션에는 들어가지 않는다.
    try {
      const reply = await sendChat(
        provider,
        apiKey,
        toAdapterMessages(afterUser),
      );
      if (!mountedRef.current) return;
      // 응답을 스토어에 append → 이전 대화 위에 순서대로 누적·유지(SC-3).
      // 활성 제공자를 귀속으로 실어(평가 재료 식별) 저장한다 — apiKey는 제외.
      setMessages(appendMessage(token, "ai", reply, provider).messages);
    } catch (err) {
      if (!mountedRef.current) return;
      // LlmError는 맥락 있는 메시지를, 그 외는 일반 폴백을 노출(키는 미포함).
      setError(err instanceof LlmError ? err.message : s.errorGeneric);
    } finally {
      if (mountedRef.current) setPending(false);
    }
  }

  /*
   * 1단계 → 2단계. 연결했든 건너뛰었든 같은 문으로 들어간다. 이 순간 풀이
   * 시작 시각을 찍어(markStarted) 경과 시간의 기준점을 세운다 — 이미 찍혀
   * 있으면 그대로 두므로 재진입해도 시계가 되돌아가지 않는다.
   */
  function enterChat() {
    markStarted(token);
    setPhase("chat");
  }

  // "제출하기" — 즉시 제출하지 않고 확인 모달을 연다(되돌릴 수 없는 액션).
  function openConfirm() {
    setConfirmOpen(true);
  }

  // "최종 제출" — 대화 로그와 제출 시각을 스토어에 확정(M-4)하고, 제출 플래그로
  // 재응시가 잠긴 뒤(M-5) 완료 화면으로 전진한다.
  function confirmSubmit() {
    markSubmitted(token);
    setConfirmOpen(false);
    navigate(nextStepPath(token, "solve")!);
  }

  // 언마운트 시 진행 중 응답의 상태 갱신을 무시하도록 플래그를 내린다.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 모달이 열리면 확정 버튼으로 초점을 옮기고, Escape로 취소할 수 있게 한다.
  useEffect(() => {
    if (!confirmOpen) return;
    confirmButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  // 1단계 — 본인 AI 연결(건너뛰기 가능). 대화·타이머는 아직 시작하지 않는다.
  if (phase === "connect") {
    return (
      <div className="flow-screen">
        <ConnectStep
          provider={provider}
          apiKey={apiKey}
          onProviderChange={setProvider}
          onApiKeyChange={setApiKey}
          onContinue={enterChat}
          onSkip={enterChat}
        />
        <div className="flow-actions">
          <button
            type="button"
            className="btn btn--low-emphasis"
            onClick={() => navigate(prevStepPath(token, "solve")!)}
          >
            {s.backAction}
          </button>
        </div>
      </div>
    );
  }

  // 2단계 — 좌: 경과 시간 + 흘러가는 구름 / 우: 고정된 문제 + 대화.
  return (
    <div className="flow-screen">
      <div className="solve-layout">
        {/* 좌 — 시간을 재는 자리. 대화에서 눈을 떼지 않아도 곁눈으로 보인다 */}
        <aside className="solve-aside">
          <DriftingClouds />
          <div className="solve-aside__content">
            <span className="solve-phase-label">{s.phaseChatLabel}</span>
            <SolveTimer startedAt={session.startedAt} />
          </div>
        </aside>

        {/* 우 — 문제를 머리에 붙여 두고 그 아래에서 대화한다 */}
        <div className="solve-main">
          <ProblemPin problem={session.problem} />

          {/* 건너뛴 경우 — 대화를 시작할 수 없으므로 되돌아갈 문을 준다 */}
          {provider === null || !hasKey ? (
            <div className="solve-notconnected">
              <h2 className="solve-notconnected__title">
                {s.notConnectedTitle}
              </h2>
              <p className="solve-notconnected__body">{s.notConnectedBody}</p>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setPhase("connect")}
              >
                {s.notConnectedAction}
              </button>
            </div>
          ) : null}

          <section className="conversation" aria-label={s.title}>
            <div className="conversation__list">
              {messages.length === 0 && !pending ? (
                <div className="empty-state">
                  <h1 className="empty-state__title">{s.emptyTitle}</h1>
                  <p className="empty-state__description">
                    {s.emptyDescription}
                  </p>
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

              {/* 응답 대기('생각 중') — AI측 말풍선 안에 작성자 라벨 + 대기
                  인디케이터(스피너 + pendingText). aria-live="polite"로 응답
                  대기 상태를 스크린리더가 낭독한다. 응답 도착 시 사라진다. */}
              {pending && (
                <div
                  className="message-bubble conversation__pending"
                  role="status"
                  aria-live="polite"
                >
                  <span className="message-bubble__author">{aiAuthor}</span>
                  <span className="loading">
                    <span className="spinner" aria-hidden="true" />
                    <span className="loading__text">{s.pendingText}</span>
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* composer — 입력(.input) + 전송(.btn) 묶음 */}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            {/* LLM 호출 실패 — 비차단 오류 토스트(색 + 아이콘 + 메시지 병행) */}
            {error && (
              <div className="toast toast--error" role="alert">
                <span className="toast__icon" aria-hidden="true">
                  !
                </span>
                <span className="toast__message">{error}</span>
              </div>
            )}
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
              {provider === null
                ? s.composerHintNoProvider
                : !hasKey
                  ? s.composerHintNoKey
                  : s.composerHint}
            </p>
          </form>

          <div className="flow-actions">
            <button
              type="button"
              className="btn btn--low-emphasis"
              onClick={() => navigate(prevStepPath(token, "solve")!)}
            >
              {s.backAction}
            </button>
            <button type="button" className="btn" onClick={openConfirm}>
              {s.primaryAction}
            </button>
          </div>
        </div>
      </div>

      {/* 제출 확인 모달(modal 프리미티브) — 되돌릴 수 없는 제출을 한 번 더 확인.
          "최종 제출" 시에만 로그·제출 시각 확정 후 재응시 잠금이 성립(SC-4). */}
      {confirmOpen && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
            aria-describedby="submit-modal-body"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal__header">
              <h2 className="modal__title" id="submit-modal-title">
                {s.submitModal.title}
              </h2>
            </header>
            <div className="modal__body" id="submit-modal-body">
              {s.submitModal.body}
            </div>
            <footer className="modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setConfirmOpen(false)}
              >
                {s.submitModal.cancelAction}
              </button>
              <button
                type="button"
                className="btn"
                ref={confirmButtonRef}
                onClick={confirmSubmit}
              >
                {s.submitModal.confirmAction}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
