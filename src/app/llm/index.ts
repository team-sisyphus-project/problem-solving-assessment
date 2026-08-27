/*
 * BYOP LLM 어댑터 계층 — 공개 진입점
 * ---------------------------------------------------------------------------
 * `sendChat(provider, apiKey, messages)` 하나로 선택된 제공자에게 대화를 보내고
 * 응답 텍스트를 받는다. 제공자별 REST 세부(엔드포인트·헤더·요청/응답 매핑)는
 * providers/* 어댑터가 격리한다. 화면·서버·키 입력 필드는 이 계층의 범위 밖이다.
 *
 * 비밀값 원칙: apiKey는 인자로만 흐르고 요청 헤더에서만 소비된다. 이 계층은
 * 어디에도 키를 저장·로그하지 않는다(영속 로직 자체가 없다).
 * ---------------------------------------------------------------------------
 */

import { adapterRegistry } from "./registry";
import {
  LlmError,
  isProviderId,
  type ChatMessage,
  type ProviderId,
} from "./types";

/**
 * 선택된 제공자·키로 대화를 전송하고 LLM 응답 텍스트를 반환한다.
 *
 * @param provider 제공자 식별자(gpt/claude/gemini)
 * @param apiKey   지원자 본인 키 — 인자로만 전달, 저장·로그하지 않음
 * @param messages 대화 로그(user로 시작해 교대) — 비어 있으면 안 됨
 * @throws {LlmError} 알 수 없는 제공자·빈 키·빈 메시지, 또는 어댑터 호출 실패 시
 */
export async function sendChat(
  provider: ProviderId,
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  if (!isProviderId(provider)) {
    throw new LlmError(
      provider,
      `알 수 없는 제공자입니다: ${String(provider)}.`,
    );
  }
  if (!apiKey || apiKey.trim().length === 0) {
    throw new LlmError(provider, "An API key is required.");
  }
  if (messages.length === 0) {
    throw new LlmError(provider, "There is no message to send.");
  }

  return adapterRegistry[provider].send(apiKey, messages);
}

export { adapterRegistry } from "./registry";
export {
  LlmError,
  PROVIDER_IDS,
  isProviderId,
  type ChatMessage,
  type ChatRole,
  type ProviderAdapter,
  type ProviderId,
} from "./types";
