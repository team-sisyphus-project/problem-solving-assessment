/*
 * OpenAI (GPT) adapter — Chat Completions REST
 * ---------------------------------------------------------------------------
 * Called directly from the browser. apiKey travels only in the Authorization
 * header and is never stored or logged. ChatMessage[] (role: user/assistant)
 * is mapped to OpenAI messages.
 * ---------------------------------------------------------------------------
 */

import { postJson } from "../http";
import { LlmError, type ChatMessage, type ProviderAdapter } from "../types";

/** Implementation settings (not design tokens) — model and endpoint */
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
