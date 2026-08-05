/*
 * 테스트 부트스트랩 — jest-dom 매처 등록 + 격리 초기화
 * ---------------------------------------------------------------------------
 * - `@testing-library/jest-dom`으로 `toBeInTheDocument` 등 DOM 매처를 확장한다.
 * - 세션 스토어가 localStorage에 토큰별 세션을 영속하므로, 각 테스트가
 *   깨끗한 상태에서 시작하도록 매 테스트 후 DOM과 localStorage를 비운다
 *   (테스트 간 배정 상태 누수 방지).
 * ---------------------------------------------------------------------------
 */

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
