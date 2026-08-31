/*
 * S-3 / M-4 — Consent record (consentGiven/consentAt) persistence, non-UI verification
 * ---------------------------------------------------------------------------
 * Verifies only the store contract, statically and data-wise, without rendering:
 *   - After recordConsent, the session's consent has given=true and a valid
 *     ISO timestamp in at.
 *   - Calling it again leaves the original consent time (at) unchanged (idempotent).
 *   - Loading a legacy session that lacked the consent field fills it with the
 *     default null.
 *
 * The persistence layer is still localStorage only (before the backend from
 * master-plan item 1 lands). Each test clears localStorage in beforeEach to
 * isolate session state.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getOrCreateSession,
  getSession,
  recordConsent,
  saveSession,
  type InviteSession,
} from "../../src/app/session/store";

const TOKEN = "consent-record-token";
// Date.prototype.toISOString() format (UTC, 3-digit milliseconds).
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("Consent record persistence, non-UI verification (S-3/M-4)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("a new session's consent starts as null (before consent)", () => {
    const session = getOrCreateSession(TOKEN);
    expect(session.consent).toBeNull();
  });

  it("recordConsent stores consentGiven=true and a valid ISO consentAt", () => {
    recordConsent(TOKEN);
    const consent = getSession(TOKEN)?.consent;

    expect(consent).not.toBeNull();
    expect(consent?.given).toBe(true);
    // at must be an ISO string in shape and an actually parseable time.
    expect(consent?.at).toMatch(ISO_PATTERN);
    expect(Number.isNaN(Date.parse(consent!.at))).toBe(false);
  });

  it("calling it again leaves the original consent time (at) unchanged (idempotent)", () => {
    const first = recordConsent(TOKEN);
    const firstAt = first.consent!.at;

    const again = recordConsent(TOKEN);
    expect(again.consent!.given).toBe(true);
    expect(again.consent!.at).toBe(firstAt);
    // The persistence layer (localStorage) also keeps the original time intact.
    expect(getSession(TOKEN)?.consent?.at).toBe(firstAt);
  });

  it("loading a legacy session without a consent field fills it with the default null", () => {
    const base = getOrCreateSession(TOKEN);
    // Remove the consent field to reproduce a pre-migration (legacy) saved state.
    const legacy = { ...base } as Partial<InviteSession>;
    delete legacy.consent;
    saveSession(legacy as InviteSession);

    const loaded = getSession(TOKEN);
    expect(loaded).not.toBeNull();
    expect(loaded?.consent).toBeNull();
    // Other fields are fully preserved so parsing does not break.
    expect(loaded?.token).toBe(TOKEN);
    expect(loaded?.problem.id).toBe(base.problem.id);
  });
});
