/*
 * 초대 세션 스토어 — 토큰별 응시 세션(localStorage 영속)
 * ---------------------------------------------------------------------------
 * 스펙 "기록되어야 하는 데이터"를 클라이언트에 보관하는 최소 스토어. 실제
 * 백엔드/API는 범위 밖이므로(이 골격 grain) 토큰을 키로 브라우저 localStorage에
 * 세션을 저장/조회한다. 토큰별로 격리되어 다른 지원자의 데이터가 섞이지 않는다.
 *
 * 세션에 담기는 것(스펙 접점):
 *   - candidate : 지원자 식별 정보(이름/이메일). 본인 확인 전에는 null.
 *   - problem   : 배정된 문제(목업 조회, `problems.ts`)
 *   - messages  : 전체 대화 로그(순서 + 각 메시지 시각)
 *   - submittedAt : 제출 시각(ISO). 미제출이면 null → 재응시 잠금 판단 기준(M-5)
 *
 * 폼/제출 모달 로직 자체는 후속 grain. 이 모듈은 저장/조회 계약만 제공한다.
 * ---------------------------------------------------------------------------
 */

import { assignProblem, type Problem } from "./problems";
import type { ProviderId } from "../llm";

/** 미리보기/딥링크 기본 진입용 데모 토큰(루트·알 수 없는 경로 fallback 대상) */
export const DEMO_TOKEN = "demo-2f9c4a";

export type MessageRole = "applicant" | "ai";

export interface ChatMessage {
  /** 세션 내 순번(1-based, 발급 순서) */
  id: number;
  /** 작성자 역할 */
  role: MessageRole;
  /** 메시지 본문 */
  text: string;
  /** 작성 시각(ISO) — 로그 순서·시각 기록 요건 */
  at: string;
  /**
   * 응답을 생성한 AI 제공자(귀속). AI 메시지에만 실린다 — 지원자(applicant)
   * 발화에는 없다. 평가 화면이 "어느 제공자로 푼 응답인가"를 식별하는 재료.
   * 비밀 경계: 제공자 식별자만 담고 apiKey는 절대 담지 않는다.
   */
  provider?: ProviderId;
}

export interface Candidate {
  name: string;
  email: string;
}

export interface InviteSession {
  /** 초대 토큰(스토리지 키) */
  token: string;
  /** 지원자 식별 정보 — 본인 확인 전에는 null */
  candidate: Candidate | null;
  /** 배정된 문제(목업 조회 결과) */
  problem: Problem;
  /** 전체 대화 로그(순서·시각 포함) */
  messages: ChatMessage[];
  /** 제출 시각(ISO). 미제출이면 null */
  submittedAt: string | null;
  /**
   * 문제 풀이를 시작한 시각(ISO). 풀이 화면의 경과 시간 표시가 이 값을 기준으로
   * 센다. 새로고침해도 시간이 0으로 되돌아가지 않도록 세션에 남긴다.
   * 아직 시작하지 않았으면 null이며, 제한 시간이 아니라 **경과 시간**이다.
   *
   * 평가 재료(EvaluationRecord)에는 싣지 않는다 — 지원자가 스스로 속도를
   * 가늠하기 위한 화면 표시일 뿐, 평가 기준이 아니다.
   */
  startedAt: string | null;
}

/**
 * 평가 재료 — 고객사 평가 화면이 소비하는 한 지원자의 응시 스냅샷.
 *
 * 스펙 "기록되어야 하는 데이터"(고객사 화면과의 접점)를 하나의 계약으로 조립한다:
 *   - candidate  : 지원자 식별 정보(이름/이메일). 본인 확인 전이면 null.
 *   - problem    : 배정된 문제 1건.
 *   - messages   : 순서(id)·시각(at)·제공자 귀속 포함 전체 대화 로그.
 *   - submittedAt: 제출 시각(ISO). 미제출이면 null.
 *
 * 비밀 경계: apiKey 등 비밀값은 이 재료 어디에도 포함하지 않는다. messages는
 * 세션 로그를 그대로 재사용하며, 세션 로그에는 애초에 키가 들어가지 않는다.
 */
export interface EvaluationRecord {
  /** 초대 토큰 — 어느 응시의 재료인지 식별 */
  token: string;
  /** 지원자 식별 정보 — 본인 확인 전에는 null */
  candidate: Candidate | null;
  /** 배정된 문제 1건 */
  problem: Problem;
  /** 순서·시각·제공자 귀속을 포함한 전체 대화 로그 */
  messages: ChatMessage[];
  /** 제출 시각(ISO). 미제출이면 null */
  submittedAt: string | null;
}

const STORAGE_PREFIX = "invite-session:";

function storageKey(token: string): string {
  return `${STORAGE_PREFIX}${token}`;
}

/** localStorage 접근 가드(비활성/예외 환경에서도 안전) */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 토큰의 세션을 읽는다. 없거나 파싱 불가면 null */
export function getSession(token: string): InviteSession | null {
  const store = safeStorage();
  if (!store) return null;
  const raw = store.getItem(storageKey(token));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InviteSession;
    // startedAt은 나중에 추가된 필드라, 이전에 저장된 세션에는 없을 수 있다.
    return { ...parsed, startedAt: parsed.startedAt ?? null };
  } catch {
    return null;
  }
}

/** 세션을 저장한다(덮어쓰기) */
export function saveSession(session: InviteSession): void {
  const store = safeStorage();
  if (!store) return;
  store.setItem(storageKey(session.token), JSON.stringify(session));
}

/**
 * 토큰의 세션을 반환하되, 없으면 문제를 배정해 새 세션을 만들어 저장한다.
 * (첫 접근 시점에 배정 문제가 고정된다 — M-2)
 */
export function getOrCreateSession(token: string): InviteSession {
  const existing = getSession(token);
  if (existing) return existing;
  const created: InviteSession = {
    token,
    candidate: null,
    problem: assignProblem(token),
    messages: [],
    submittedAt: null,
    startedAt: null,
  };
  saveSession(created);
  return created;
}

/**
 * 문제 풀이 시작 시각을 기록한다(이미 시작했으면 기존 시각 유지).
 * 풀이 화면에 처음 도달한 순간 한 번만 찍히고, 이후 재진입·새로고침에도
 * 같은 기준점이 유지된다.
 */
export function markStarted(token: string): InviteSession {
  const session = getOrCreateSession(token);
  if (session.startedAt) return session;
  const next = { ...session, startedAt: new Date().toISOString() };
  saveSession(next);
  return next;
}

/** 지원자 식별 정보를 기록한다(본인 확인 완료) */
export function setCandidate(token: string, candidate: Candidate): InviteSession {
  const session = getOrCreateSession(token);
  const next = { ...session, candidate };
  saveSession(next);
  return next;
}

/**
 * 대화 로그에 메시지 한 건을 추가한다. 순번(id)과 시각(at)은 스토어가 발급하며,
 * 갱신된 세션을 반환한다.
 *
 * AI 메시지에는 응답을 생성한 제공자를 귀속으로 실을 수 있다(provider). 지원자
 * 발화에는 제공자가 없으므로 role이 "ai"가 아니면 provider는 무시한다. apiKey
 * 등 비밀값은 인자에 포함되지 않으며 로그에도 남지 않는다.
 */
export function appendMessage(
  token: string,
  role: MessageRole,
  text: string,
  provider?: ProviderId,
): InviteSession {
  const session = getOrCreateSession(token);
  const nextId =
    session.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  const message: ChatMessage = {
    id: nextId,
    role,
    text,
    at: new Date().toISOString(),
    // 제공자 귀속은 AI 응답에만 유효하다(지원자 발화에는 싣지 않는다).
    ...(role === "ai" && provider ? { provider } : {}),
  };
  const next = { ...session, messages: [...session.messages, message] };
  saveSession(next);
  return next;
}

/** 제출 시각을 기록한다(이미 제출됐으면 기존 시각 유지) */
export function markSubmitted(token: string): InviteSession {
  const session = getOrCreateSession(token);
  if (session.submittedAt) return session;
  const next = { ...session, submittedAt: new Date().toISOString() };
  saveSession(next);
  return next;
}

/** 제출 완료(재응시 잠금) 여부 — M-5 판단 기준 */
export function isSubmitted(token: string): boolean {
  return getSession(token)?.submittedAt != null;
}

/**
 * 토큰의 세션에서 고객사 평가 화면용 평가 재료를 조립한다.
 *
 * 지원자 식별 정보·배정 문제·순서/시각/제공자 귀속 포함 전체 대화 로그·제출
 * 시각을 하나의 `EvaluationRecord`로 모은다. 세션이 없으면 문제를 배정해
 * 생성한다(첫 접근 시점 고정, M-2). 반환 로그는 세션 로그의 복사본이라 이후
 * 세션 변경이 이미 조립된 재료에 새지 않는다.
 *
 * 비밀 경계: 반환 재료 어디에도 apiKey 등 비밀값이 포함되지 않는다 —
 * 세션 로그 자체가 키를 담지 않기 때문이다.
 */
export function buildEvaluationRecord(token: string): EvaluationRecord {
  const session = getOrCreateSession(token);
  return {
    token: session.token,
    candidate: session.candidate,
    problem: session.problem,
    messages: session.messages.map((m) => ({ ...m })),
    submittedAt: session.submittedAt,
  };
}
