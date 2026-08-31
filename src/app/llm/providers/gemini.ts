/*
 * Google (Gemini) adapter — Generative Language REST
 * ---------------------------------------------------------------------------
 * Called directly from the browser. apiKey travels in the `x-goog-api-key`
 * header (never in the query string, avoiding URL/log exposure). Storing or
 * logging it is forbidden.
 *
 * Message mapping: Gemini calls the assistant role `model` (user stays as-is).
 * The body uses the contents[].parts[].text structure.
 * Response: candidates[0].content.parts[].text values are concatenated. No
 * candidates or a block is an error.
 * ---------------------------------------------------------------------------
 */

import { postJson } from "../http";
import { LlmError, type ChatMessage, type ProviderAdapter } from "../types";

/** Implementation settings (not design tokens) */
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
        `Gemini blocked the request (${data.promptFeedback.blockReason}).`,
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
