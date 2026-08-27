/*
 * Anthropic(Claude) 어댑터 — Messages REST, 브라우저 직접 호출
 * ---------------------------------------------------------------------------
 * claude-api 스킬 준수:
 *   - 엔드포인트 POST /v1/messages, 모델 claude-opus-4-8(기본).
 *   - 헤더: x-api-key, anthropic-version, content-type. 브라우저에서 직접 부르므로
 *     `anthropic-dangerous-direct-browser-access: true`가 필요하다(CORS 허용).
 *   - opus-4-8은 adaptive thinking만 지원하나 단순 채팅이므로 thinking 파라미터를
 *     생략한다(생략 시 thinking 없이 동작). budget_tokens/temperature 등은 보내면
 *     400이므로 넣지 않는다.
 *   - 응답 content[]의 text 블록만 이어 붙인다. refusal(빈 content) 등은 에러.
 *
 * apiKey는 x-api-key 헤더로만 전달, 저장·로그 금지.
 * ---------------------------------------------------------------------------
 */

import { postJson } from "../http";
import { LlmError, type ChatMessage, type ProviderAdapter } from "../types";

/** 구현 설정값(디자인 토큰 아님) */
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 4096;

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
}

export const anthropicAdapter: ProviderAdapter = {
  id: "claude",

  async send(apiKey: string, messages: ChatMessage[]): Promise<string> {
    const data = await postJson<AnthropicResponse>(
      "claude",
      ENDPOINT,
      {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
    );

    if (data.stop_reason === "refusal") {
      throw new LlmError("claude", "Claude declined to answer this request.");
    }

    const text = (data.content ?? [])
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("");

    if (!text) {
      throw new LlmError("claude", "The Claude response contained no text.");
    }
    return text;
  },
};
