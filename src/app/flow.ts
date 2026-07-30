/*
 * 흐름 구조 (고정) — 지원자 선형 응시 흐름 4단계
 * ---------------------------------------------------------------------------
 * Spec: components/app-shell/base.md · components/navigation/base.md 의
 * "흐름 구조 (고정)" 규칙을 코드로 옮긴 단일 정의. 라우터·단계 표시자
 * (navigation)·화면 전환이 모두 이 배열을 공유하므로 단계 순서가 한 곳에서만
 * 관리된다(산개 방지).
 *
 *   1. 시작·안내  →  2. LLM 연결/선택  →  3. 문제 풀이  →  4. 제출 완료
 *
 * - 순서는 좌→우로 고정. 이전은 완료, 이후는 예정.
 * - 제출 완료(4)는 흐름의 종료 상태(이후 전진 없음).
 * ---------------------------------------------------------------------------
 */

import { strings } from "./strings";

export type StepId = "start" | "connect" | "solve" | "complete";

export interface FlowStep {
  /** 단계 식별자 */
  id: StepId;
  /** 라우터 경로(해시 라우팅) */
  path: string;
  /** 단계 표시자에 노출되는 짧은 레이블 */
  label: string;
}

/** 선형 흐름의 단일 정의 — 순서가 곧 단계 번호(1-based) */
export const FLOW_STEPS: readonly FlowStep[] = [
  { id: "start", path: "/start", label: strings.screens.start.stepLabel },
  { id: "connect", path: "/connect", label: strings.screens.connect.stepLabel },
  { id: "solve", path: "/solve", label: strings.screens.solve.stepLabel },
  { id: "complete", path: "/complete", label: strings.screens.complete.stepLabel },
] as const;

/** 흐름의 첫 단계 경로(진입·fallback 기본값) */
export const FIRST_STEP_PATH = FLOW_STEPS[0].path;

/** 단계 인덱스(0-based). 없으면 -1 */
export function stepIndex(id: StepId): number {
  return FLOW_STEPS.findIndex((s) => s.id === id);
}

/** 다음 단계 경로. 종료 단계면 null */
export function nextStepPath(id: StepId): string | null {
  const i = stepIndex(id);
  if (i < 0 || i >= FLOW_STEPS.length - 1) return null;
  return FLOW_STEPS[i + 1].path;
}

/** 이전 단계 경로. 첫 단계면 null */
export function prevStepPath(id: StepId): string | null {
  const i = stepIndex(id);
  if (i <= 0) return null;
  return FLOW_STEPS[i - 1].path;
}

/** 단계 상태(완료/현재/예정) — 색 단독이 아닌 텍스트·형태 병행용 */
export type StepStatus = "done" | "current" | "upcoming";

export function stepStatus(stepIdx: number, currentIdx: number): StepStatus {
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}
