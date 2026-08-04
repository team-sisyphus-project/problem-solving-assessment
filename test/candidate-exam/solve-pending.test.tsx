/*
 * SC-3a / M-3 — 응답 대기('생각 중') 상태 표시 전용 검증
 * ---------------------------------------------------------------------------
 * 시나리오 SC-3a: 지원자가 풀이 화면에서 메시지를 전송하면, LLM 응답이 아직
 * 도착하지 않은 동안(sendChat 미해결) "생각 중" 등 응답 대기 상태가 화면에
 * 나타나야 한다.
 *
 * 이 파일은 그 대기 상태 하나만 집중 검증한다:
 *   1. 전송 전에는 대기 표시가 없다.
 *   2. 전송 후 sendChat이 pending인 동안 대기 표시(pendingText AI 버블)가 뜬다.
 *   3. 응답이 resolve되면 대기 표시가 사라지고 응답 텍스트가 자리를 잇는다.
 *
 * 어댑터(sendChat)는 경계에서 목킹한다 — 실제 REST 호출은 어댑터 테스트가
 * 담당하고, 여기서는 "미해결 Promise ↔ 대기 UI" 배선만 확인한다.
 * (solve-byop.test.tsx의 목킹·헬퍼 패턴 재사용.)
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// 어댑터 경계 목킹 — sendChat만 제어한다(factory hoist 대비 vi.hoisted).
const { sendChatMock } = vi.hoisted(() => ({ sendChatMock: vi.fn() }));
vi.mock("../../src/app/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/llm")>();
  return { ...actual, sendChat: sendChatMock };
});

import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { strings } from "../../src/app/i18n";

const s = strings.screens.solve;
const TOKEN = "solve-pending-token";
const API_KEY = "sk-pending-secret-xyz789";

function renderSolve() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}/solve`]}>
      <Routes>
        <Route path="/invite/:token/solve" element={<SolveScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 제공자 선택 → 본인 API 키 입력까지 수행한다(전송 준비 상태). */
function selectProviderAndKey() {
  fireEvent.click(screen.getByRole("button", { name: strings.providers.gpt }));
  fireEvent.change(
    screen.getByLabelText(`${strings.providers.gpt} ${s.keyFieldLabel}`),
    { target: { value: API_KEY } },
  );
}

function sendMessage(text: string) {
  fireEvent.change(screen.getByLabelText(s.composerPlaceholder), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: s.sendAction }));
}

describe("SolveScreen — 응답 대기 상태 표시 (SC-3a/M-3)", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
  });

  it("전송 전에는 대기 표시가 없고, 전송 후 응답 도착 전까지만 대기 표시가 나타났다 사라진다", async () => {
    // 수동으로 resolve할 수 있는 미해결 Promise — sendChat이 pending인 창을 만든다.
    let resolveReply: (v: string) => void = () => {};
    sendChatMock.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveReply = resolve;
      }),
    );

    renderSolve();
    selectProviderAndKey();

    // (1) 전송 전: 대기 표시가 화면에 없다.
    expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument();

    // (2) 전송 → sendChat이 미해결인 동안: 대기 표시가 나타난다.
    sendMessage("응답 대기가 보여야 한다");
    const pending = await screen.findByText(s.pendingText);
    expect(pending).toBeInTheDocument();

    // 대기 표시는 응답 텍스트가 아직 없는 상태에서 노출된다.
    expect(screen.queryByText("도착한 응답")).not.toBeInTheDocument();

    // (3) 응답 resolve → 대기 표시가 사라지고 응답 텍스트가 자리를 잇는다.
    resolveReply("도착한 응답");
    await waitFor(() =>
      expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("도착한 응답")).toBeInTheDocument();
  });

  it("대기 표시는 AI측 말풍선(role=status, aria-live=polite)으로 스크린리더에 알린다", async () => {
    let resolveReply: (v: string) => void = () => {};
    sendChatMock.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveReply = resolve;
      }),
    );

    renderSolve();
    selectProviderAndKey();
    sendMessage("대기 버블 접근성 확인");

    // pendingText를 담은 조상 중 aria-live=polite인 status 버블이 있어야 한다.
    const pendingText = await screen.findByText(s.pendingText);
    const liveRegion = pendingText.closest('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveAttribute("role", "status");

    // 정리: 진행 중 Promise를 resolve해 상태 갱신 경고를 남기지 않는다.
    resolveReply("정리용 응답");
    await waitFor(() =>
      expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument(),
    );
  });
});
