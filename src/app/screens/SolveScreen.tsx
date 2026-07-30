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

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../i18n";
import {
  appendMessage,
  getOrCreateSession,
  markSubmitted,
  type ChatMessage,
} from "../session/store";

type ProviderId = keyof typeof strings.providers;

const PROVIDER_IDS = Object.keys(strings.providers) as ProviderId[];

export function SolveScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.solve;

  // 활성 AI 제공자(M-5) — 참조 화면 안에서 직접 선택. 선택 전에는 무채색 유지
  // (provider-group 원칙 2), 선택된 하나만 accent로 승격(원칙 3).
  const [provider, setProvider] = useState<ProviderId | null>(null);

  // 대화 로그는 토큰 세션 스토어가 원본(source of truth) — 진입 시 기존 로그를
  // 불러오고, 전송마다 스토어에 append 후 화면 상태를 동기화한다(토큰별 영속).
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => getOrCreateSession(token).messages,
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  // 제출 확인 모달 열림 상태(M-4·M-5) — "제출하기"는 즉시 제출하지 않고 이
  // 모달을 띄운다. "최종 제출" 확정 시에만 잠금이 성립한다.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // stub 응답 타이머 — 언마운트 시 정리.
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 모달의 확정(주요) 액션 — 열릴 때 초점을 이 버튼으로 옮긴다.
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  // 전송은 제공자 선택 + 입력이 모두 있을 때만(응답 AI가 정해져야 대화 가능).
  const canSend = provider !== null && draft.trim().length > 0 && !pending;
  // 선택된 제공자가 곧 응답 AI — 작성자 라벨에 반영(미선택 시 일반 라벨).
  const aiAuthor = provider ? strings.providers[provider] : s.authorAi;

  function handleSend() {
    const text = draft.trim();
    if (!text || pending || provider === null) return;

    // 지원자 발화를 스토어에 기록(순서·시각 포함) 후 화면 동기화.
    setMessages(appendMessage(token, "applicant", text).messages);
    setDraft("");
    setPending(true);

    // stub: 잠시 뒤 AI 응답 버블을 스토어에 추가하고 대기 표시를 해제(로컬 시연).
    replyTimer.current = setTimeout(() => {
      setMessages(appendMessage(token, "ai", s.stubReply).messages);
      setPending(false);
    }, 700);
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
          onClick={() => navigate(prevStepPath(token, "solve")!)}
        >
          {s.backAction}
        </button>
        <button type="button" className="btn" onClick={openConfirm}>
          {s.primaryAction}
        </button>
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
