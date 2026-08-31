/*
 * S-3 / M-4 — 동의 기록(consentGiven/consentAt) 저장 non-UI 검증
 * ---------------------------------------------------------------------------
 * 렌더 없이 스토어 계약만 정적·데이터 방식으로 확인한다:
 *   - recordConsent 후 세션 consent가 given=true, at이 유효 ISO 타임스탬프.
 *   - 재호출해도 최초 동의 시각(at) 불변(멱등).
 *   - consent 필드가 없던 레거시 세션을 로드해도 기본값 null로 채워진다.
 *
 * 영속 계층은 아직 localStorage뿐이다(마스터플랜 항목1 백엔드 도입 선행 전).
 * 각 테스트는 beforeEach에서 localStorage를 비워 세션 상태를 격리한다.
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
// Date.prototype.toISOString() 포맷(UTC, 밀리초 3자리).
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("동의 기록 저장 non-UI 검증 (S-3/M-4)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("새 세션의 consent 초기값은 null이다 (동의 전)", () => {
    const session = getOrCreateSession(TOKEN);
    expect(session.consent).toBeNull();
  });

  it("recordConsent는 consentGiven=true와 유효 ISO consentAt을 저장한다", () => {
    recordConsent(TOKEN);
    const consent = getSession(TOKEN)?.consent;

    expect(consent).not.toBeNull();
    expect(consent?.given).toBe(true);
    // at은 형식상 ISO 문자열이면서, 실제로 파싱 가능한 시각이어야 한다.
    expect(consent?.at).toMatch(ISO_PATTERN);
    expect(Number.isNaN(Date.parse(consent!.at))).toBe(false);
  });

  it("재호출해도 최초 동의 시각(at)이 불변이다 (멱등)", () => {
    const first = recordConsent(TOKEN);
    const firstAt = first.consent!.at;

    const again = recordConsent(TOKEN);
    expect(again.consent!.given).toBe(true);
    expect(again.consent!.at).toBe(firstAt);
    // 영속 계층(localStorage)에도 최초 시각이 그대로 남는다.
    expect(getSession(TOKEN)?.consent?.at).toBe(firstAt);
  });

  it("consent 필드가 없던 레거시 세션을 로드하면 기본값 null로 채워진다", () => {
    const base = getOrCreateSession(TOKEN);
    // consent 필드를 제거해 마이그레이션 이전(레거시) 저장 상태를 재현한다.
    const legacy = { ...base } as Partial<InviteSession>;
    delete legacy.consent;
    saveSession(legacy as InviteSession);

    const loaded = getSession(TOKEN);
    expect(loaded).not.toBeNull();
    expect(loaded?.consent).toBeNull();
    // 다른 필드는 온전히 유지되어 파싱이 깨지지 않는다.
    expect(loaded?.token).toBe(TOKEN);
    expect(loaded?.problem.id).toBe(base.problem.id);
  });
});
