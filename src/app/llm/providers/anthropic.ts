/*
 * Anthropic (Claude) adapter — Messages REST, called directly from the browser
 * ---------------------------------------------------------------------------
 * Follows the claude-api skill:
 *   - Endpoint POST /v1/messages, model claude-opus-4-8 (default).
 *   - Headers: x-api-key, anthropic-version, content-type. Since the call is
 *     made directly from the browser,
 *     `anthropic-dangerous-direct-browser-access: true` is required (enables CORS).
 *   - opus-4-8 supports adaptive thinking only, but this is simple chat, so
 *     the thinking parameter is omitted (omitting it runs without thinking).
 *     budget_tokens/temperature and the like return 400 if sent, so they are
 *     left out.
 *   - Only the text blocks in the response content[] are concatenated.
 *     Refusal (empty content) and the like are errors.
 *
 * apiKey travels only in the x-api-key header; storing or logging it is forbidden.
 * ---------------------------------------------------------------------------
 */

import { postJson } from "../http";
import { LlmError, type ChatMessage, type ProviderAdapter } from "../types";

/** Implementation settings (not design tokens) */
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
