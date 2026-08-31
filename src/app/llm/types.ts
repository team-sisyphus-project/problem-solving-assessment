/*
 * LLM adapter layer — shared types (business logic ↔ 3rd-party boundary)
 * ---------------------------------------------------------------------------
 * Gathers BYOP's (Bring Your Own Provider) provider, message, and error
 * contracts in one place. This module depends on neither the session store
 * nor the screen strings — adapters must expose only their own domain types
 * so that if one provider disappears the rest stand untouched (isolation),
 * and tests can verify the contract by mocking fetch alone.
 *
 * ChatMessage's role is the API-neutral `user`/`assistant`. Mapping to the
 * screen's session log (role: applicant/ai) belongs to the wiring grain and
 * is never pulled inside this boundary.
 *
 * apiKey is never persisted or logged anywhere — it flows only as a function
 * argument and is consumed only in request headers (a secret).
 * ---------------------------------------------------------------------------
 */

/** Supported provider identifiers — the same set as the i18n `providers` keys (gpt/claude/gemini) */
export type ProviderId = "gpt" | "claude" | "gemini";

/** List of provider identifiers (single source for the registry and validation) */
export const PROVIDER_IDS: readonly ProviderId[] = ["gpt", "claude", "gemini"];

/** Determines whether an arbitrary string is a known provider (runtime boundary guard) */
export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/** Conversation role — LLM-API-neutral representation */
export type ChatRole = "user" | "assistant";

/** Adapter input message — the caller guarantees ordering (starts with user and alternates) */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * Provider adapter — the boundary isolating each provider's REST API.
 * `send` takes apiKey only as an argument, puts it in request headers,
 * returns the response text, and throws `LlmError` on failure. It never
 * stores or logs the key.
 */
export interface ProviderAdapter {
  readonly id: ProviderId;
  send(apiKey: string, messages: ChatMessage[]): Promise<string>;
}

/**
 * Error that conveys adapter failures meaningfully. Carries the HTTP status
 * (when available) and the provider so callers can show the user a message
 * with context. Neither the message nor any field ever includes the apiKey.
 */
export class LlmError extends Error {
  readonly provider: ProviderId;
  readonly status?: number;

  constructor(provider: ProviderId, message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.provider = provider;
    this.status = status;
    // Restore the prototype so instanceof works in transpiled classes
    Object.setPrototypeOf(this, LlmError.prototype);
  }
}
