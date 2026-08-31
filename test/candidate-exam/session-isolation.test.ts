/*
 * SC-2 / M-2 — Assigned problem store isolation
 * ---------------------------------------------------------------------------
 * Below the render layer, verifies that the session store itself isolates the
 * assigned problem per token. Different tokens have different sessions, and
 * one token's assigned problem never leaks into another token's session. Also
 * verifies that the same token's assignment stays fixed on re-lookup.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { getOrCreateSession } from "../../src/app/session/store";
import { assignProblem } from "../../src/app/session/problems";

const TOKEN_A = "token-a";
const TOKEN_B = "token-b";

describe("Session store — per-token assignment isolation (SC-2/M-2)", () => {
  it("each token's session holds only the problem assigned to that token", () => {
    const a = getOrCreateSession(TOKEN_A);
    const b = getOrCreateSession(TOKEN_B);

    expect(a.token).toBe(TOKEN_A);
    expect(b.token).toBe(TOKEN_B);
    expect(a.problem.id).toBe(assignProblem(TOKEN_A).id);
    expect(b.problem.id).toBe(assignProblem(TOKEN_B).id);
  });

  it("assigned problems of different tokens do not mix (isolation)", () => {
    const a = getOrCreateSession(TOKEN_A);
    const b = getOrCreateSession(TOKEN_B);

    // Premise: the two tokens receive different problems. If this premise
    // breaks, the isolation check is meaningless.
    expect(assignProblem(TOKEN_A).id).not.toBe(assignProblem(TOKEN_B).id);
    expect(a.problem.id).not.toBe(b.problem.id);
  });

  it("the same token's assignment stays fixed across re-lookups", () => {
    const first = getOrCreateSession(TOKEN_A);
    const again = getOrCreateSession(TOKEN_A);

    expect(again.problem.id).toBe(first.problem.id);
  });
});
