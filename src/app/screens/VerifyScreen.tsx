/*
 * VerifyScreen — flow step 1: identity verification (`/invite/:token`)
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/input/base.md        (name/email form controls — default/error states)
 *   components/empty-state/base.md  (retake lock notice after submission)
 *   foundations/i18n-strings.md     (screens.verify namespace)
 *
 * The candidate entering from the invite link verifies their identity with
 * minimal information (name, email) — no separate sign-up/login (SC-1) — and
 * starts the assessment. Once local validation passes, the identity is saved
 * to the session (setCandidate) and the flow advances to the problem brief.
 *
 * The retake lock after submission (SC-4/M-5) is handled not by this screen
 * but by the shared guard at the shell layer (AppShell) across the whole flow
 * — when submitted, the shell replaces this screen with the lock notice
 * before the identity verification index is ever reached, so this screen only
 * deals with the not-yet-submitted state.
 *
 * The screen is a two-column composition. The left is a scanning effect over
 * the assigned problem (ProblemScan), letting the candidate read "what this
 * place is about" while filling in the form. The right is the actual input.
 * On narrow screens they stack vertically.
 *
 * Real email verification and server-side validation are out of scope — only
 * format validation is performed locally.
 * Zero hardcoded styles — every visual detail depends only on the primitives
 * (.input/.empty-state/.btn) and the token classes in screens.css.
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath } from "../flow";
import { strings } from "../i18n";
import { recordConsent, setCandidate } from "../session/store";
import { ProblemScan } from "./verify/ProblemScan";

/** Minimal email format validation (local) — real verification is out of scope */
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
  // Consent to data review (S-1) — cannot advance to the next step without an explicit check.
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
    // Without consent, block progression and surface the reason (persona C —
    // tell them why they were blocked). The button announces its disabled
    // state via aria-disabled but still accepts the click so the notice can
    // be shown.
    const consentMissing = !consent;
    setConsentError(consentMissing);
    if (found.name || found.email || consentMissing) return;

    // Identity verification and consent complete — save the identity to the
    // session and advance to the problem brief (no sign-up).
    setCandidate(token, { name: name.trim(), email: email.trim() });
    // Record consent status and timestamp at the gate-passing point
    // (idempotent, S-3/M-4). With no backend, storage stays at the
    // localStorage layer (depends on master plan item 1).
    recordConsent(token);
    navigate(nextStepPath(token, "verify")!);
  }

  const nameErrorId = "verify-name-error";
  const emailErrorId = "verify-email-error";
  const consentErrorId = "verify-consent-error";

  return (
    <div className="flow-screen">
      <div className="split-panel">
        {/* Left — the scanning effect over the problem. Placed beside the form to give context */}
        <ProblemScan />

        {/* Right — the actual input (name, email) */}
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

            {/* Consent to data review (S-1) — below the inputs, above the
               continue button. Both notices carry equal weight (persona B),
               and only checking the box allows advancing to the next step. */}
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
