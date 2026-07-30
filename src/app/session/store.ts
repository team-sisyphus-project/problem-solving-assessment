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
    return JSON.parse(raw) as InviteSession;
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
  };
  saveSession(created);
  return created;
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
 */
export function appendMessage(
  token: string,
  role: MessageRole,
  text: string,
): InviteSession {
  const session = getOrCreateSession(token);
  const nextId =
    session.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  const message: ChatMessage = {
    id: nextId,
    role,
    text,
    at: new Date().toISOString(),
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
