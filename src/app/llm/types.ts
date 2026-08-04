/*
 * LLM 어댑터 계층 — 공용 타입 (business logic ↔ 3rd-party 경계)
 * ---------------------------------------------------------------------------
 * BYOP(Bring Your Own Provider)의 제공자·메시지·에러 계약을 한곳에 모은다.
 * 이 모듈은 세션 스토어나 화면 문자열에 의존하지 않는다 — 어댑터가 자기 도메인
 * 타입만 노출해야 제공자 하나가 사라져도 나머지가 그대로 서고(격리), 테스트에서
 * fetch만 목킹해 계약을 검증할 수 있다.
 *
 * ChatMessage의 role은 API-중립적인 `user`/`assistant`다. 화면의 세션 로그
 * (role: applicant/ai)와의 매핑은 배선 grain의 몫이며, 이 경계 안으로 끌고
 * 들어오지 않는다.
 *
 * apiKey는 어디에도 영속·로그하지 않는다 — 함수 인자로만 흐르고 요청 헤더에서만
 * 소비된다(비밀값).
 * ---------------------------------------------------------------------------
 */

/** 지원 제공자 식별자 — i18n `providers` 키(gpt/claude/gemini)와 동일 집합 */
export type ProviderId = "gpt" | "claude" | "gemini";

/** 제공자 식별자 목록(레지스트리·검증용 단일 출처) */
export const PROVIDER_IDS: readonly ProviderId[] = ["gpt", "claude", "gemini"];

/** 임의 문자열이 알려진 제공자인지 판별(런타임 경계 가드) */
export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/** 대화 역할 — LLM API 중립 표현 */
export type ChatRole = "user" | "assistant";

/** 어댑터 입력 메시지 — 순서는 호출자가 보장(user로 시작해 교대) */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * 제공자 어댑터 — 각 제공자 REST API를 격리하는 경계.
 * `send`는 apiKey를 인자로만 받아 요청 헤더에 싣고, 응답 텍스트를 반환하며,
 * 실패 시 `LlmError`를 throw 한다. 키를 저장·로그하지 않는다.
 */
export interface ProviderAdapter {
  readonly id: ProviderId;
  send(apiKey: string, messages: ChatMessage[]): Promise<string>;
}

/**
 * 어댑터 실패를 의미 있게 전달하는 에러. HTTP 상태(있으면)와 제공자를 담아
 * 호출부가 사용자에게 맥락 있는 메시지를 보일 수 있게 한다.
 * 메시지·필드 어디에도 apiKey를 포함하지 않는다.
 */
export class LlmError extends Error {
  readonly provider: ProviderId;
  readonly status?: number;

  constructor(provider: ProviderId, message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.provider = provider;
    this.status = status;
    // 트랜스파일된 클래스에서 instanceof 가 동작하도록 프로토타입 복원
    Object.setPrototypeOf(this, LlmError.prototype);
  }
}
