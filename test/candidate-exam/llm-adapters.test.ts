/*
 * BYOP LLM adapter contract verification (grain-1 · DoneWhen)
 * ---------------------------------------------------------------------------
 * Verified with a mocked fetch, no real network:
 *   - Per-provider routing (endpoint) · request mapping (headers/body) · response parsing
 *   - Error propagation (non-2xx -> LlmError, including status code)
 *   - Guards for unknown provider · empty key · empty messages
 *   - The apiKey is never persisted anywhere (localStorage unchanged, not exposed in URLs)
 * ---------------------------------------------------------------------------
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LlmError,
  PROVIDER_IDS,
  sendChat,
  type ChatMessage,
  type ProviderId,
} from "../../src/app/llm";

/** Shape of fetch call arguments (for test helpers) */
interface FetchCall {
  url: string;
  init: RequestInit;
}

/** Mock fetch — records the last call and returns the given JSON response */
function stubFetch(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", impl);
  return { calls };
}

/** Parses and returns the request body */
function bodyOf(call: FetchCall): any {
  return JSON.parse(call.init.body as string);
}

/** Normalizes headers into a plain object */
function headersOf(call: FetchCall): Record<string, string> {
  return (call.init.headers ?? {}) as Record<string, string>;
}

const MESSAGES: ChatMessage[] = [
  { role: "user", content: "How should I solve the problem?" },
  { role: "assistant", content: "Start by organizing the requirements." },
  { role: "user", content: "What is the next step?" },
];

const KEY = "sk-secret-key-value";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendChat routing · request mapping · response parsing", () => {
  it("gpt -> routes to OpenAI chat/completions and returns the response text", async () => {
    const { calls } = stubFetch({
      choices: [{ message: { content: "GPT's answer" } }],
    });

    const out = await sendChat("gpt", KEY, MESSAGES);

    expect(out).toBe("GPT's answer");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(headersOf(calls[0]).authorization).toBe(`Bearer ${KEY}`);

    const body = bodyOf(calls[0]);
    expect(body.model).toBe("gpt-4o");
    expect(body.messages).toEqual([
      { role: "user", content: "How should I solve the problem?" },
      { role: "assistant", content: "Start by organizing the requirements." },
      { role: "user", content: "What is the next step?" },
    ]);
  });

  it("claude -> routes to Anthropic messages and concatenates only the text blocks", async () => {
    const { calls } = stubFetch({
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "Claude " },
        { type: "text", text: "answer" },
      ],
    });

    const out = await sendChat("claude", KEY, MESSAGES);

    expect(out).toBe("Claude answer");
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");

    const headers = headersOf(calls[0]);
    expect(headers["x-api-key"]).toBe(KEY);
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    // Header required for direct browser calls (claude-api skill)
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");

    const body = bodyOf(calls[0]);
    expect(body.model).toBe("claude-opus-4-8");
    expect(body.max_tokens).toBeGreaterThan(0);
    // Do not send parameters that trigger a 400
    expect(body.temperature).toBeUndefined();
    expect(body.budget_tokens).toBeUndefined();
    expect(body.messages).toEqual([
      { role: "user", content: "How should I solve the problem?" },
      { role: "assistant", content: "Start by organizing the requirements." },
      { role: "user", content: "What is the next step?" },
    ]);
  });

  it("gemini -> routes to generateContent and maps assistant to the model role", async () => {
    const { calls } = stubFetch({
      candidates: [{ content: { parts: [{ text: "Gemini's answer" }] } }],
    });

    const out = await sendChat("gemini", KEY, MESSAGES);

    expect(out).toBe("Gemini's answer");
    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    );
    // The key travels in a header — it is not exposed in the URL
    expect(headersOf(calls[0])["x-goog-api-key"]).toBe(KEY);
    expect(calls[0].url).not.toContain(KEY);

    const body = bodyOf(calls[0]);
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "How should I solve the problem?" }] },
      { role: "model", parts: [{ text: "Start by organizing the requirements." }] },
      { role: "user", parts: [{ text: "What is the next step?" }] },
    ]);
  });
});

describe("error propagation", () => {
  it("a non-2xx response propagates as an LlmError carrying the status code", async () => {
    stubFetch(
      { error: { message: "invalid api key" } },
      { ok: false, status: 401 },
    );

    await expect(sendChat("gpt", KEY, MESSAGES)).rejects.toMatchObject({
      name: "LlmError",
      provider: "gpt",
      status: 401,
    });
  });

  it("the error message carries the details but never the apiKey", async () => {
    stubFetch({ error: { message: "bad request" } }, { ok: false, status: 400 });

    const err = await sendChat("claude", KEY, MESSAGES).catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect((err as Error).message).toContain("bad request");
    expect((err as Error).message).not.toContain(KEY);
  });

  it("a network failure (fetch reject) is wrapped in an LlmError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    await expect(sendChat("gemini", KEY, MESSAGES)).rejects.toBeInstanceOf(
      LlmError,
    );
  });

  it("an empty response (no text) is treated as an LlmError", async () => {
    stubFetch({ content: [] });
    await expect(sendChat("claude", KEY, MESSAGES)).rejects.toBeInstanceOf(
      LlmError,
    );
  });

  it("a Claude refusal response propagates as a refusal error", async () => {
    stubFetch({ stop_reason: "refusal", content: [] });
    await expect(sendChat("claude", KEY, MESSAGES)).rejects.toMatchObject({
      name: "LlmError",
      provider: "claude",
    });
  });
});

describe("input guards", () => {
  it("an unknown provider throws an LlmError without any fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      sendChat("mistral" as ProviderId, KEY, MESSAGES),
    ).rejects.toBeInstanceOf(LlmError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("an empty or whitespace key throws an LlmError without any fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(sendChat("gpt", "", MESSAGES)).rejects.toBeInstanceOf(LlmError);
    await expect(sendChat("gpt", "   ", MESSAGES)).rejects.toBeInstanceOf(
      LlmError,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("an empty message array throws an LlmError without any fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(sendChat("gpt", KEY, [])).rejects.toBeInstanceOf(LlmError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("secret handling — apiKey persistence forbidden", () => {
  it("leaves nothing in localStorage after a successful call", async () => {
    stubFetch({ choices: [{ message: { content: "ok" } }] });

    await sendChat("gpt", KEY, MESSAGES);

    expect(window.localStorage.length).toBe(0);
  });

  it("for every provider the key travels only in request headers, never in the URL", async () => {
    for (const provider of PROVIDER_IDS) {
      const { calls } = stubFetch(
        provider === "gpt"
          ? { choices: [{ message: { content: "ok" } }] }
          : provider === "claude"
            ? { content: [{ type: "text", text: "ok" }] }
            : { candidates: [{ content: { parts: [{ text: "ok" }] } }] },
      );

      await sendChat(provider, KEY, MESSAGES);

      const call = calls[0];
      expect(call.url).not.toContain(KEY);
      const serializedHeaders = JSON.stringify(headersOf(call));
      expect(serializedHeaders).toContain(KEY);
      // The key does not leak into the body either
      expect(call.init.body as string).not.toContain(KEY);

      vi.unstubAllGlobals();
    }
  });
});
