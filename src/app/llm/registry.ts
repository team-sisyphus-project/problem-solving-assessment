/*
 * Provider adapter registry — identifier → adapter
 * ---------------------------------------------------------------------------
 * To add a provider, add one adapter file and register it here. sendChat
 * routes off this table alone, so all branching lives in one place (isolate
 * what varies).
 * ---------------------------------------------------------------------------
 */

import { anthropicAdapter } from "./providers/anthropic";
import { geminiAdapter } from "./providers/gemini";
import { openaiAdapter } from "./providers/openai";
import type { ProviderAdapter, ProviderId } from "./types";

/** Identifier → adapter. The key set is enforced to be isomorphic to ProviderId. */
export const adapterRegistry: Record<ProviderId, ProviderAdapter> = {
  gpt: openaiAdapter,
  claude: anthropicAdapter,
  gemini: geminiAdapter,
};
