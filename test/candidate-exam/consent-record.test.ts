/*
 * S-3 / M-4 — 동의 기록(consentGiven/consentAt) 저장 로직
 * ---------------------------------------------------------------------------
 * 게이트 통과 시 세션에 동의 여부·시각이 기록되는지, 재호출에도 최초 시각이
 * 유지되는지(멱등), 그리고 consent 필드가 없던 이전 세션을 로드해도 기본값이
 * 채워져 파싱이 깨지지 않는지 검증한다.
 *
 * 백엔드 영속(마스터플랜 항목1)은 범위 밖 — 저장은 localStorage 계층에 머문다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import {
  getOrCreateSession,
  getSession,
  recordConsent,
  saveSession,
  type InviteSession,
} from "../../src/app/session/store";

const TOKEN = "consent-token";
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("동의 기록 저장 (S-3/M-4)", () => {
  it("새 세션의 consent 초기값은 null이다", () => {
    const session = getOrCreateSession(TOKEN);
    expect(session.consent).toBeNull();
  });

  it("recordConsent는 given=true와 유효 ISO at을 세션에 저장한다", () => {
    recordConsent(TOKEN);
    const session = getSession(TOKEN);

    expect(session?.consent).not.toBeNull();
    expect(session?.consent?.given).toBe(true);
    expect(session?.consent?.at).toMatch(ISO_PATTERN);
    // 저장된 시각은 실제 파싱 가능한 시각이어야 한다.
    expect(Number.isNaN(Date.parse(session!.consent!.at))).toBe(false);
  });

  it("재호출해도 최초 동의 시각이 유지된다 (멱등)", () => {
    const first = recordConsent(TOKEN);
    const firstAt = first.consent!.at;

    const again = recordConsent(TOKEN);
    expect(again.consent!.given).toBe(true);
    expect(again.consent!.at).toBe(firstAt);

    // 영속 계층에도 최초 시각이 그대로 남는다.
    expect(getSession(TOKEN)?.consent?.at).toBe(firstAt);
  });

  it("consent 필드가 없던 이전 세션을 로드해도 기본값(null)이 채워져 파싱이 깨지지 않는다", () => {
    const base = getOrCreateSession(TOKEN);
    // consent 필드를 제거해 마이그레이션 이전 상태를 재현한다.
    const legacy = { ...base } as Partial<InviteSession>;
    delete legacy.consent;
    saveSession(legacy as InviteSession);

    const loaded = getSession(TOKEN);
    expect(loaded).not.toBeNull();
    expect(loaded?.consent).toBeNull();
    // 다른 필드는 온전히 유지된다.
    expect(loaded?.token).toBe(TOKEN);
    expect(loaded?.problem.id).toBe(base.problem.id);
  });
});
