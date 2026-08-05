/*
 * 제공자 어댑터 레지스트리 — 식별자 → 어댑터
 * ---------------------------------------------------------------------------
 * 제공자를 늘리려면 어댑터 파일 하나를 추가하고 여기 등록하면 된다. sendChat는
 * 이 표만 보고 라우팅하므로 분기문이 한곳에 모인다(isolate what varies).
 * ---------------------------------------------------------------------------
 */

import { anthropicAdapter } from "./providers/anthropic";
import { geminiAdapter } from "./providers/gemini";
import { openaiAdapter } from "./providers/openai";
import type { ProviderAdapter, ProviderId } from "./types";

/** 식별자 → 어댑터. 키 집합은 ProviderId 와 동형이 강제된다. */
export const adapterRegistry: Record<ProviderId, ProviderAdapter> = {
  gpt: openaiAdapter,
  claude: anthropicAdapter,
  gemini: geminiAdapter,
};
