/*
 * Assigned-problem mock lookup — token → one problem (deterministic assignment)
 *
 * NOTE (language): this product's user-facing language is English only
 * (Korean is not supported). The mock problem text is content the candidate
 * reads, so it stays English-only as well.
 * ---------------------------------------------------------------------------
 * In the real service, the token would look up the one problem the server
 * assigned from either the client company's registered problems or the
 * platform's default set (the assignment logic itself belongs to the client
 * company screen spec). This skeleton grain provides a **mock lookup** only,
 * with no backend/API: the token string is hashed deterministically to assign
 * one problem from a fixed pool (same token → always the same problem, M-2).
 *
 * NOTE: problem titles/descriptions are **domain data** the server sends down
 * (a response payload), not screen chrome (UI labels). They therefore live in
 * this mock data module, not in the i18n key dictionary. When the real
 * integration lands, this module is replaced by an API lookup.
 * ---------------------------------------------------------------------------
 */

export interface Problem {
  /** Problem identifier */
  id: string;
  /** Problem title */
  title: string;
  /** Problem description (requirements) */
  description: string;
}

/** Mock problem pool — the fixed set assignments draw from until the real integration */
export const PROBLEM_POOL: readonly Problem[] = [
  {
    id: "prob-onboarding-funnel",
    title: "Reduce drop-off in new-user onboarding",
    description:
      "A SaaS product loses a large share of new users within their first week. Walk through how you would look at the data, what hypotheses you would form, and what you would try to fix first.",
  },
  {
    id: "prob-incident-postmortem",
    title: "Design an incident postmortem",
    description:
      "A payments API failed intermittently for thirty minutes. Lay out how you would run the postmortem: finding the cause, and making sure it does not happen again.",
  },
  {
    id: "prob-pricing-experiment",
    title: "Design a pricing experiment",
    description:
      "A team is introducing subscription tiers for the first time. Describe the experiment you would run to find the right price without damaging revenue, and the metrics you would judge it by.",
  },
];

/** Converts a token string to a deterministic hash (unsigned 32-bit) */
function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Returns the one problem assigned to the token.
 *
 * The same token and the same attempt always get the same problem (M-2).
 * Starting fresh while keeping the previous submission raises the attempt
 * number, which moves that many slots forward in the pool — handing back the
 * same problem would turn "start again" into a retry. Once the pool wraps
 * around, it starts over from the beginning (only as many distinct problems
 * as the pool holds).
 */
export function assignProblem(token: string, attempt = 0): Problem {
  const idx = (hashToken(token) + attempt) % PROBLEM_POOL.length;
  return PROBLEM_POOL[idx];
}
