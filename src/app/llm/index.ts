/*
 * BYOP LLM adapter layer — public entry point
 * ---------------------------------------------------------------------------
 * A single `sendChat(provider, apiKey, messages)` sends the conversation to
 * the selected provider and returns the response text. Provider-specific REST
 * details (endpoints, headers, request/response mapping) are isolated in the
 * providers/* adapters. Screens, servers, and the key input field are outside
 * this layer's scope.
 *
 * Secret principle: apiKey flows only as an argument and is consumed only in
 * request headers. This layer never stores or logs the key anywhere (it has
 * no persistence logic at all).
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
 * Sends the conversation with the selected provider and key, and returns the
 * LLM response text.
 *
 * @param provider Provider identifier (gpt/claude/gemini)
 * @param apiKey   The candidate's own key — passed as an argument only, never stored or logged
 * @param messages Conversation log (starts with user and alternates) — must not be empty
 * @throws {LlmError} On an unknown provider, empty key, empty messages, or adapter call failure
 */
export async function sendChat(
  provider: ProviderId,
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  if (!isProviderId(provider)) {
    throw new LlmError(
      provider,
      `Unknown provider: ${String(provider)}.`,
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
