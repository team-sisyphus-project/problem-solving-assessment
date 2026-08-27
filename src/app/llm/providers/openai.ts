/*
 * OpenAI(GPT) 어댑터 — Chat Completions REST
 * ---------------------------------------------------------------------------
 * 브라우저에서 직접 호출. apiKey는 Authorization 헤더로만 전달하고 저장·로그하지
 * 않는다. ChatMessage[](role: user/assistant) → OpenAI messages 로 매핑한다.
 * ---------------------------------------------------------------------------
 */

import { postJson } from "../http";
import { LlmError, type ChatMessage, type ProviderAdapter } from "../types";

/** 구현 설정값(디자인 토큰 아님) — 모델·엔드포인트 */
const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export const openaiAdapter: ProviderAdapter = {
  id: "gpt",

  async send(apiKey: string, messages: ChatMessage[]): Promise<string> {
    const data = await postJson<OpenAiResponse>(
      "gpt",
      ENDPOINT,
      { authorization: `Bearer ${apiKey}` },
      {
        model: MODEL,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
    );

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new LlmError("gpt", "The GPT response contained no text.");
    }
    return text;
  },
};
