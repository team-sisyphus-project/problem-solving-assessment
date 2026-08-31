/*
 * Shared HTTP helper for the LLM adapters
 * ---------------------------------------------------------------------------
 * JSON POST + error normalization shared by the three provider adapters.
 * Network failures, non-2xx responses, and unparsable bodies are all promoted
 * to `LlmError`, so callers never need to know each provider's failure shape
 * (errors are information — propagate them with context, never swallow them).
 *
 * Only the browser-global `fetch` is used. Tests mock this `fetch` to verify
 * routing, mapping, parsing, and error propagation without a real network.
 * ---------------------------------------------------------------------------
 */

import { LlmError, type ProviderId } from "./types";

/** Best-effort extraction of a human-readable detail message from a non-2xx response body */
async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return "";
    try {
      // Most providers use { error: { message } } or { error: { ... } }
      const data = JSON.parse(text) as {
        error?: { message?: string } | string;
      };
      if (typeof data.error === "string") return data.error;
      if (data.error?.message) return data.error.message;
    } catch {
      // Not JSON — fall back to the raw text (length-capped)
    }
    return text.slice(0, 500);
  } catch {
    return "";
  }
}

/**
 * POSTs a JSON body and returns the parsed response.
 * Every failure is thrown as `LlmError`:
 *   - the network call itself failing (fetch reject)
 *   - HTTP non-2xx (with status and detail)
 *   - unparsable response JSON
 */
export async function postJson<T>(
  provider: ProviderId,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LlmError(
      provider,
      `The ${provider} request could not be sent (network error).`,
    );
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(response);
    throw new LlmError(
      provider,
      `The ${provider} request failed (HTTP ${response.status})` +
        (detail ? `: ${detail}` : "") +
        ".",
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new LlmError(
      provider,
      `The ${provider} response could not be parsed.`,
      response.status,
    );
  }
}
