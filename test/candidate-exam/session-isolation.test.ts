/*
 * SC-2 / M-2 — 배정 문제 스토어 격리
 * ---------------------------------------------------------------------------
 * 렌더 계층 밑에서 세션 스토어 자체가 토큰별로 배정 문제를 격리하는지 검증한다.
 * 서로 다른 토큰은 서로 다른 세션을 가지며, 한 토큰의 배정 문제가 다른 토큰의
 * 세션으로 새어 나가지 않는다. 또한 같은 토큰은 재조회 시 배정이 고정된다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { getOrCreateSession } from "../../src/app/session/store";
import { assignProblem } from "../../src/app/session/problems";

const TOKEN_A = "token-a";
const TOKEN_B = "token-b";

describe("세션 스토어 — 토큰별 배정 격리 (SC-2/M-2)", () => {
  it("각 토큰 세션은 자기 토큰에 배정된 문제만 보관한다", () => {
    const a = getOrCreateSession(TOKEN_A);
    const b = getOrCreateSession(TOKEN_B);

    expect(a.token).toBe(TOKEN_A);
    expect(b.token).toBe(TOKEN_B);
    expect(a.problem.id).toBe(assignProblem(TOKEN_A).id);
    expect(b.problem.id).toBe(assignProblem(TOKEN_B).id);
  });

  it("서로 다른 토큰의 배정 문제는 섞이지 않는다 (격리)", () => {
    const a = getOrCreateSession(TOKEN_A);
    const b = getOrCreateSession(TOKEN_B);

    // 전제: 두 토큰은 다른 문제를 받는다. 이 전제가 깨지면 격리 검증이 무의미.
    expect(assignProblem(TOKEN_A).id).not.toBe(assignProblem(TOKEN_B).id);
    expect(a.problem.id).not.toBe(b.problem.id);
  });

  it("같은 토큰의 배정은 재조회에도 고정된다", () => {
    const first = getOrCreateSession(TOKEN_A);
    const again = getOrCreateSession(TOKEN_A);

    expect(again.problem.id).toBe(first.problem.id);
  });
});
