/*
 * VerifyScreen — 흐름 1단계: 본인 확인 (`/invite/:token`)
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/input/base.md        (이름·이메일 폼 컨트롤 — 기본/오류 상태)
 *   components/empty-state/base.md  (제출 후 재응시 잠금 안내)
 *   foundations/i18n-strings.md     (screens.verify 네임스페이스)
 *
 * 초대 링크로 진입한 지원자가 별도 회원가입/로그인 없이(SC-1) 최소 정보(이름·
 * 이메일)로 본인을 확인하고 응시를 시작한다. 로컬 검증을 통과하면 신원을 세션에
 * 저장(setCandidate)하고 문제 안내(brief)로 전진한다.
 *
 * 제출 후 재응시 잠금(SC-4/M-5)은 이 화면이 아니라 셸 계층(AppShell)의 공유
 * 가드가 흐름 전체에 걸쳐 담당한다 — 제출됨이면 본인 확인 인덱스에 도달하기
 * 전에 셸이 잠금 안내로 대체하므로, 이 화면은 미제출 상태만 다룬다.
 *
 * 화면은 2단 구성이다. 왼쪽은 배정된 문제를 훑어 내려가는 스캔 연출(ProblemScan)
 * 로, 폼을 채우는 동안 "무엇을 보는 자리인가"를 읽게 한다. 오른쪽이 실제 입력이다.
 * 좁은 화면에서는 위아래로 쌓인다.
 *
 * 실제 이메일 인증·서버 검증은 범위 밖 — 형식 검증만 로컬로 수행한다.
 * 하드코딩 스타일 0 — 모든 시각 표현은 프리미티브(.input/.empty-state/.btn)와
 * screens.css의 토큰 클래스에만 의존한다.
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath } from "../flow";
import { strings } from "../i18n";
import { recordConsent, setCandidate } from "../session/store";
import { ProblemScan } from "./verify/ProblemScan";

/** 최소 이메일 형식 검증(로컬) — 실제 인증은 범위 밖 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
}

export function VerifyScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.verify;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  // 데이터 열람 동의(S-1) — 명시적 체크 없이는 다음 단계로 넘어갈 수 없다.
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (name.trim().length === 0) {
      next.name = s.errorNameRequired;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      next.email = s.errorEmailRequired;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      next.email = s.errorEmailInvalid;
    }
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    // 미동의면 진행을 막고 이유를 노출한다(페르소나 C — 왜 막혔는지 알린다).
    // 버튼은 aria-disabled로 비활성 상태를 알리되 클릭 자체는 받아 안내를 띄운다.
    const consentMissing = !consent;
    setConsentError(consentMissing);
    if (found.name || found.email || consentMissing) return;

    // 본인 확인·동의 완료 — 신원을 세션에 저장하고 문제 안내로 전진(회원가입 없음).
    setCandidate(token, { name: name.trim(), email: email.trim() });
    // 게이트 통과 지점에서 동의 여부·시각을 기록한다(멱등, S-3/M-4). 백엔드
    // 부재로 저장은 localStorage 계층에 머문다(마스터플랜 항목1 의존).
    recordConsent(token);
    navigate(nextStepPath(token, "verify")!);
  }

  const nameErrorId = "verify-name-error";
  const emailErrorId = "verify-email-error";
  const consentErrorId = "verify-consent-error";

  return (
    <div className="flow-screen">
      <div className="split-panel">
        {/* 좌 — 문제를 훑어 내려가는 연출. 폼과 나란히 두어 맥락을 준다 */}
        <ProblemScan />

        {/* 우 — 실제 입력(이름·이메일) */}
        <div className="split-panel__form">
          <div className="empty-state empty-state--start">
            <h1 className="empty-state__title">{s.title}</h1>
            <p className="empty-state__description">{s.description}</p>
          </div>

          <form className="verify-form" noValidate onSubmit={handleSubmit}>
            <div className="input-field">
              <label className="input-field__label" htmlFor="verify-name">
                {s.nameLabel}
              </label>
              <input
                id="verify-name"
                className={errors.name ? "input input--error" : "input"}
                type="text"
                autoComplete="name"
                placeholder={s.namePlaceholder}
                value={name}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? nameErrorId : undefined}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
              />
              {errors.name && (
                <p id={nameErrorId} className="input-field__error" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="input-field">
              <label className="input-field__label" htmlFor="verify-email">
                {s.emailLabel}
              </label>
              <input
                id="verify-email"
                className={errors.email ? "input input--error" : "input"}
                type="email"
                autoComplete="email"
                placeholder={s.emailPlaceholder}
                value={email}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? emailErrorId : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
              />
              {errors.email ? (
                <p id={emailErrorId} className="input-field__error" role="alert">
                  {errors.email}
                </p>
              ) : (
                <p className="input-field__helper">{s.formHint}</p>
              )}
            </div>

            {/* 데이터 열람 동의(S-1) — 입력 아래, 진행 버튼 위. 두 고지를 같은
               무게로 나눠 싣고(페르소나 B), 체크해야만 다음 단계로 넘어간다. */}
            <div className="verify-consent">
              <p className="verify-consent__title">{s.consentTitle}</p>
              <p className="verify-consent__statement">{s.consentReview}</p>
              <p className="verify-consent__statement">{s.consentNoTraining}</p>
              <label className="verify-consent__check">
                <input
                  type="checkbox"
                  className="verify-consent__checkbox"
                  checked={consent}
                  aria-describedby={consentError ? consentErrorId : undefined}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (consentError) setConsentError(false);
                  }}
                />
                <span className="verify-consent__check-label">
                  {s.consentCheckboxLabel}
                </span>
              </label>
              {consentError && (
                <p
                  id={consentErrorId}
                  className="input-field__error"
                  role="alert"
                >
                  {s.consentRequired}
                </p>
              )}
            </div>

            <div className="flow-actions flow-actions--start">
              <button
                type="submit"
                className="btn"
                aria-disabled={consent ? undefined : true}
              >
                {s.primaryAction}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
