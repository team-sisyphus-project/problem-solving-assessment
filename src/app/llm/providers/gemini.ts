/*
 * Google(Gemini) 어댑터 — Generative Language REST
 * ---------------------------------------------------------------------------
 * 브라우저에서 직접 호출. apiKey는 `x-goog-api-key` 헤더로 전달한다(쿼리스트링에
 * 키를 싣지 않아 URL·로그 노출을 피한다). 저장·로그 금지.
 *
 * 메시지 매핑: Gemini는 assistant 역할을 `model`로 부른다(user는 그대로).
 * 본문은 contents[].parts[].text 구조.
 * 응답: candidates[0].content.parts[].text 를 이어 붙인다. 후보 없음/차단은 에러.
 * ---------------------------------------------------------------------------
 */

import { postJson } from "../http";
import { LlmError, type ChatMessage, type ProviderAdapter } from "../types";

/** 구현 설정값(디자인 토큰 아님) */
const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

export const geminiAdapter: ProviderAdapter = {
  id: "gemini",

  async send(apiKey: string, messages: ChatMessage[]): Promise<string> {
    const data = await postJson<GeminiResponse>(
      "gemini",
      ENDPOINT,
      { "x-goog-api-key": apiKey },
      {
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      },
    );

    if (data.promptFeedback?.blockReason) {
      throw new LlmError(
        "gemini",
        `Gemini가 요청을 차단했습니다(${data.promptFeedback.blockReason}).`,
      );
    }

    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("");

    if (!text) {
      throw new LlmError("gemini", "The Gemini response contained no text.");
    }
    return text;
  },
};
