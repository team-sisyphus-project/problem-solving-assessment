/*
 * 흐름 구조 (고정) — 지원자 선형 응시 흐름 4단계 · 토큰 스코프
 * ---------------------------------------------------------------------------
 * Spec: components/app-shell/base.md · components/navigation/base.md 의
 * "흐름 구조 (고정)" 규칙을 코드로 옮긴 단일 정의. 라우터·단계 표시자
 * (navigation)·화면 전환이 모두 이 배열을 공유하므로 단계 순서가 한 곳에서만
 * 관리된다(산개 방지).
 *
 *   1. 본인 확인  →  2. 문제 안내  →  3. 문제 풀이  →  4. 제출 완료
 *
 * - 모든 단계는 초대 토큰 스코프(`/invite/:token/...`) 아래에 있다. 각 단계의
 *   `segment`는 토큰 베이스에 상대적인 경로 조각이다.
 * - 토큰 인덱스(`/invite/:token`)는 흐름 4단계가 아니라 그 **앞단**의 웰컴 인트로
 *   화면이 차지한다(`welcomePath`). 인트로는 단계 표시자에 노출되지 않으며, 흐름의
 *   첫 단계는 여전히 본인 확인(verify)이다 — 4단계 구조 자체는 그대로다.
 * - 순서는 좌→우로 고정. 이전은 완료, 이후는 예정.
 * - 제출 완료(4)는 흐름의 종료 상태(이후 전진 없음).
 * - 이전 흐름의 "LLM 연결/선택(connect)" 단계는 제거되었다(회원가입/연결 없이
 *   본인 확인 → 문제 안내로 직행). 본인 확인(verify)·문제 안내(brief)가 신설.
 * ---------------------------------------------------------------------------
 */

import { strings } from "./i18n";

export type StepId = "verify" | "brief" | "solve" | "complete";

/** 초대 토큰 스코프 라우트의 베이스 경로 */
export const INVITE_BASE = "/invite";

export interface FlowStep {
  /** 단계 식별자 */
  id: StepId;
  /** 토큰 베이스에 상대적인 경로 조각. 첫 단계(verify)는 인덱스(빈 문자열) */
  segment: string;
  /** 단계 표시자에 노출되는 짧은 레이블 */
  label: string;
}

/** 선형 흐름의 단일 정의 — 순서가 곧 단계 번호(1-based) */
export const FLOW_STEPS: readonly FlowStep[] = [
  { id: "verify", segment: "verify", label: strings.screens.verify.stepLabel },
  { id: "brief", segment: "brief", label: strings.screens.brief.stepLabel },
  { id: "solve", segment: "solve", label: strings.screens.solve.stepLabel },
  { id: "complete", segment: "complete", label: strings.screens.complete.stepLabel },
] as const;

/** 토큰 스코프에서 특정 단계의 절대 경로를 만든다(해시 라우팅 기준) */
export function invitePath(token: string, id: StepId): string {
  const step = FLOW_STEPS.find((s) => s.id === id) ?? FLOW_STEPS[0];
  const base = `${INVITE_BASE}/${token}`;
  return step.segment ? `${base}/${step.segment}` : base;
}

/**
 * 웰컴 인트로 화면의 경로 — 초대 링크의 토큰 인덱스(`/invite/:token`).
 * 흐름 단계가 아니라 흐름 진입 직전의 환영 한 장이라 FLOW_STEPS에 넣지 않는다.
 */
export function welcomePath(token: string): string {
  return `${INVITE_BASE}/${token}`;
}

/** 토큰 흐름의 첫 단계 경로(인트로 CTA의 목적지·흐름 내 fallback 기본값) */
export function firstStepPath(token: string): string {
  return invitePath(token, FLOW_STEPS[0].id);
}

/** 단계 인덱스(0-based). 없으면 -1 */
export function stepIndex(id: StepId): number {
  return FLOW_STEPS.findIndex((s) => s.id === id);
}

/** 다음 단계의 토큰 스코프 경로. 종료 단계면 null */
export function nextStepPath(token: string, id: StepId): string | null {
  const i = stepIndex(id);
  if (i < 0 || i >= FLOW_STEPS.length - 1) return null;
  return invitePath(token, FLOW_STEPS[i + 1].id);
}

/** 이전 단계의 토큰 스코프 경로. 첫 단계면 null */
export function prevStepPath(token: string, id: StepId): string | null {
  const i = stepIndex(id);
  if (i <= 0) return null;
  return invitePath(token, FLOW_STEPS[i - 1].id);
}

/** 경로 조각(토큰 베이스 이후 부분)에서 현재 단계 id를 파생한다. 매칭 없으면 첫 단계 */
export function stepIdFromSegment(segment: string): StepId {
  const clean = segment.replace(/^\/+|\/+$/g, "");
  const found = FLOW_STEPS.find((s) => s.segment === clean);
  return found ? found.id : FLOW_STEPS[0].id;
}

/** 단계 상태(완료/현재/예정) — 색 단독이 아닌 텍스트·형태 병행용 */
export type StepStatus = "done" | "current" | "upcoming";

export function stepStatus(stepIdx: number, currentIdx: number): StepStatus {
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}
