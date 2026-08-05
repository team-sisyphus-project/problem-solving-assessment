/*
 * LLM 어댑터 공용 HTTP 헬퍼
 * ---------------------------------------------------------------------------
 * 세 제공자 어댑터가 공유하는 JSON POST + 에러 정규화. 네트워크 실패·비-2xx
 * 응답·파싱 불가를 모두 `LlmError`로 승격해, 호출부가 제공자별 실패 형태를
 * 일일이 알 필요 없게 한다(에러는 정보다 — 삼키지 않고 맥락과 함께 전파).
 *
 * 브라우저 전역 `fetch`만 사용한다. 테스트는 이 `fetch`를 목킹해 실제 네트워크
 * 없이 라우팅·매핑·파싱·에러 전파를 검증한다.
 * ---------------------------------------------------------------------------
 */

import { LlmError, type ProviderId } from "./types";

/** 비-2xx 응답 본문에서 사람이 읽을 수 있는 상세 메시지를 최선-노력으로 추출 */
async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return "";
    try {
      // 대부분의 제공자는 { error: { message } } 또는 { error: { ... } }
      const data = JSON.parse(text) as {
        error?: { message?: string } | string;
      };
      if (typeof data.error === "string") return data.error;
      if (data.error?.message) return data.error.message;
    } catch {
      // JSON 아니면 원문(길이 제한)
    }
    return text.slice(0, 500);
  } catch {
    return "";
  }
}

/**
 * JSON 본문을 POST 하고 파싱된 응답을 반환한다.
 * 실패는 전부 `LlmError`로 throw:
 *   - 네트워크 자체 실패(fetch reject)
 *   - HTTP 비-2xx (상태·상세 포함)
 *   - 응답 JSON 파싱 불가
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
      `${provider} 요청을 보내지 못했습니다(네트워크 오류).`,
    );
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(response);
    throw new LlmError(
      provider,
      `${provider} 요청이 실패했습니다(HTTP ${response.status})` +
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
      `${provider} 응답을 해석할 수 없습니다.`,
      response.status,
    );
  }
}
