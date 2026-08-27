/*
 * 애플리케이션 진입점
 * ---------------------------------------------------------------------------
 * 전역 스타일 로드 순서: 토큰(원시값) → 6 프리미티브 → 셸/내비/화면 레이아웃.
 * 이후 모든 컴포넌트는 raw 값이 아닌 토큰 클래스만 참조한다(하드코딩 0).
 * ---------------------------------------------------------------------------
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

// 디자인 토큰 + 공용 프리미티브(6종) — grain-1/2 산출물
import "../styles/tokens.css";
import "../styles/components/index.css";

// 참조 화면(문제 풀이=채팅) Component 스타일 — conversation·message-bubble·composer
import "../styles/chat.css";

// 이번 grain: 셸 · 내비 · 흐름 화면 레이아웃 (토큰 전용)
import "./styles/app-shell.css";
import "./styles/navigation.css";
import "./styles/screens.css";

// 웰컴 인트로(흐름 앞단 전면 히어로) — 셸 밖에서 쓰이는 독립 레이어라 마지막에
import "./styles/welcome.css";

import { router } from "./router";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("루트 엘리먼트(#root)를 찾을 수 없습니다.");
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
