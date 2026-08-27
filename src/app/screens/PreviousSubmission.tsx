/*
 * PreviousSubmission — 이미 제출한 링크로 흐름에 다시 들어왔을 때
 * ---------------------------------------------------------------------------
 * 예전에는 이 자리에서 흐름을 **잠갔다**("이미 제출되었습니다"). 잠금은 안전하긴
 * 하지만, 지원자 입장에서는 무엇을 제출했는지조차 못 보고 막히는 화면이었다.
 * 그래서 막는 대신 선택지를 준다.
 *
 *   1. 무엇을 냈는지 읽어 본다   — 지난 대화 로그를 그대로 펼쳐 보여 준다.
 *   2. 그대로 두고 끝낸다        — 제출 완료 화면으로.
 *   3. 새 문제로 다시 시작한다   — 회차를 올려 다른 문제를 받고 처음부터.
 *
 * 어느 쪽을 골라도 **지난 제출은 지워지지 않는다**. 제출은 되돌릴 수 없다고
 * 약속했고 담당자가 검토할 자료이기도 하므로, "새로 시작"은 덮어쓰기가 아니라
 * 옆으로 치워 두는 것이다(store의 history). 그 사실을 버튼 옆 문구로도 밝힌다.
 *
 * 하드코딩 스타일 0 — 값은 프리미티브와 flow-screens.css의 토큰 클래스에만 의존한다.
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invitePath, welcomePath } from "../flow";
import { defaultLocale, strings } from "../i18n";
import { startNewAttempt, type InviteSession } from "../session/store";

interface PreviousSubmissionProps {
  /** 제출을 마친 현재 세션 */
  session: InviteSession;
}

/**
 * ISO 시각을 읽기 쉬운 표기로.
 *
 * 브라우저 기본 로케일(toLocaleString())을 쓰면 한국어 브라우저에서 "2026. 8. 27.
 * 오후 9:28"처럼 한글이 섞여 나온다 — 이 제품은 영어 전용이므로 앱의 로케일을
 * 명시해 화면 언어와 어긋나지 않게 한다.
 */
function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(defaultLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PreviousSubmission({ session }: PreviousSubmissionProps) {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.previous;
  const solve = strings.screens.solve;

  const [open, setOpen] = useState(false);
  const logId = "previous-submission-log";

  function handleRestart() {
    // 지난 제출을 history로 옮기고 새 문제를 배정한 뒤, 처음(웰컴)부터 다시.
    startNewAttempt(token);
    navigate(welcomePath(token));
  }

  return (
    <div className="flow-screen">
      <div className="flow-panel previous">
        <div className="empty-state empty-state--start">
          <h1 className="empty-state__title">{s.title}</h1>
          <p className="empty-state__description">{s.description}</p>
        </div>

        {/* 무엇을 언제 냈는지 — 펼치지 않아도 이만큼은 보인다 */}
        <dl className="previous__summary">
          <div className="previous__row">
            <dt className="previous__term">{s.submittedAtLabel}</dt>
            <dd className="previous__value">
              {session.submittedAt ? formatMoment(session.submittedAt) : "—"}
            </dd>
          </div>
          <div className="previous__row">
            <dt className="previous__term">{s.problemLabel}</dt>
            <dd className="previous__value">{session.problem.title}</dd>
          </div>
          <div className="previous__row">
            <dt className="previous__term">{s.messagesLabel}</dt>
            <dd className="previous__value">{session.messages.length}</dd>
          </div>
          <div className="previous__row">
            <dt className="previous__term">{s.attemptLabel}</dt>
            <dd className="previous__value">{session.attempt + 1}</dd>
          </div>
        </dl>

        <div className="flow-actions flow-actions--start">
          <button
            type="button"
            className="btn btn--secondary"
            aria-expanded={open}
            aria-controls={logId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? s.hideAction : s.viewAction}
          </button>
        </div>

        {/* 제출한 대화를 그대로 되읽는다(읽기 전용 — 이어서 쓸 수 없다) */}
        {open && (
          <div className="previous__log" id={logId}>
            {session.messages.length === 0 ? (
              <p className="previous__empty">{s.emptyLog}</p>
            ) : (
              session.messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "applicant"
                      ? "message-bubble message-bubble--applicant"
                      : "message-bubble"
                  }
                >
                  <span className="message-bubble__author">
                    {m.role === "applicant"
                      ? solve.authorApplicant
                      : m.provider
                        ? strings.providers[m.provider]
                        : solve.authorAi}
                  </span>
                  <p className="message-bubble__body">{m.text}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 다시 시작할지 묻는 자리 — 무엇이 사라지고 무엇이 남는지 먼저 말한다 */}
        <div className="previous__restart">
          <h2 className="previous__restart-title">{s.restartTitle}</h2>
          <p className="previous__restart-body">{s.restartBody}</p>
          <div className="flow-actions flow-actions--start">
            <button type="button" className="btn" onClick={handleRestart}>
              {s.restartAction}
            </button>
            <button
              type="button"
              className="btn btn--low-emphasis"
              onClick={() => navigate(invitePath(token, "complete"))}
            >
              {s.keepAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
