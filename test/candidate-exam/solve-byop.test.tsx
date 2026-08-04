/*
 * SC-3 / M-3 — SolveScreen BYOP 배선 (렌더 계약)
 * ---------------------------------------------------------------------------
 * 검증 대상: 풀이 화면이 (1) 빈 대화 초기 상태를 보이고, (2) 선택한 제공자와
 * 지원자가 입력한 본인 API 키로 실제 sendChat을 호출하며, (3) 매 전송마다
 * 사용자 메시지와 응답을 순서대로 누적·유지하고, (4) 응답 대기 상태를 표시하며,
 * (5) 실패를 오류 토스트로 안내하고, (6) 입력한 키를 localStorage/저장 세션에
 * 절대 남기지 않는다.
 *
 * 어댑터(grain-1)는 경계를 목킹한다 — 이 grain은 "화면↔어댑터 배선"만 검증하고
 * 실제 REST 호출은 어댑터 테스트(llm-adapters.test.ts)가 이미 다룬다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// 어댑터 경계 목킹 — sendChat만 제어하고 LlmError는 실제 클래스를 쓴다.
// (factory는 파일 최상단으로 hoist되므로 mock 함수도 vi.hoisted로 끌어올린다.)
const { sendChatMock } = vi.hoisted(() => ({ sendChatMock: vi.fn() }));
vi.mock("../../src/app/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/llm")>();
  return { ...actual, sendChat: sendChatMock };
});

import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { strings } from "../../src/app/i18n";
import { getSession } from "../../src/app/session/store";

const s = strings.screens.solve;
const TOKEN = "solve-token";
const API_KEY = "sk-super-secret-abc123";

function renderSolve() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}/solve`]}>
      <Routes>
        <Route path="/invite/:token/solve" element={<SolveScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 제공자 선택 → 키 입력 → 본문 입력 → 전송까지 한 번 수행한다. */
function selectProviderAndKey() {
  fireEvent.click(screen.getByRole("button", { name: strings.providers.gpt }));
  const keyField = screen.getByLabelText(
    `${strings.providers.gpt} ${s.keyFieldLabel}`,
  );
  fireEvent.change(keyField, { target: { value: API_KEY } });
  return keyField as HTMLInputElement;
}

function sendMessage(text: string) {
  fireEvent.change(screen.getByLabelText(s.composerPlaceholder), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: s.sendAction }));
}

describe("SolveScreen — BYOP 배선 (SC-3/M-3)", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
  });

  it("빈 대화 초기 상태를 표시한다", () => {
    renderSolve();
    expect(
      screen.getByRole("heading", { name: s.emptyTitle }),
    ).toBeInTheDocument();
  });

  it("키 필드는 password 타입이며 제공자 선택 후에만 열린다", () => {
    renderSolve();
    // 선택 전에는 키 입력 자리가 없다.
    expect(
      screen.queryByLabelText(`${strings.providers.gpt} ${s.keyFieldLabel}`),
    ).not.toBeInTheDocument();
    const keyField = selectProviderAndKey();
    expect(keyField.type).toBe("password");
  });

  it("선택한 제공자·본인 키로 sendChat을 호출하고 응답을 순서대로 누적한다", async () => {
    sendChatMock
      .mockResolvedValueOnce("first answer")
      .mockResolvedValueOnce("second answer");

    renderSolve();
    selectProviderAndKey();

    sendMessage("first question");
    expect(await screen.findByText("first answer")).toBeInTheDocument();

    // 첫 호출: 제공자 id + 본인 키 + user 메시지 하나로 매핑.
    expect(sendChatMock).toHaveBeenNthCalledWith(1, "gpt", API_KEY, [
      { role: "user", content: "first question" },
    ]);

    sendMessage("second question");
    expect(await screen.findByText("second answer")).toBeInTheDocument();

    // 두 번째 호출: 이전 대화가 누적된 전체 로그(user/assistant 교대)로 전달.
    expect(sendChatMock).toHaveBeenNthCalledWith(2, "gpt", API_KEY, [
      { role: "user", content: "first question" },
      { role: "assistant", content: "first answer" },
      { role: "user", content: "second question" },
    ]);

    // 이전 대화가 화면에서 사라지지 않고 유지된다.
    expect(screen.getByText("first question")).toBeInTheDocument();
    expect(screen.getByText("first answer")).toBeInTheDocument();
    expect(screen.getByText("second question")).toBeInTheDocument();
  });

  it("응답 대기 중 '생각 중' 상태를 표시한다", async () => {
    let resolveReply: (v: string) => void = () => {};
    sendChatMock.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveReply = resolve;
      }),
    );

    renderSolve();
    selectProviderAndKey();
    sendMessage("thinking?");

    // 응답 도착 전: 대기 표시가 보인다.
    expect(await screen.findByText(s.pendingText)).toBeInTheDocument();

    resolveReply("done");
    await waitFor(() =>
      expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("done")).toBeInTheDocument();
  });

  it("호출 실패 시 오류 토스트를 노출한다", async () => {
    sendChatMock.mockRejectedValueOnce(new Error("boom"));

    renderSolve();
    selectProviderAndKey();
    sendMessage("will fail");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(s.errorGeneric);
  });

  it("입력한 API 키를 localStorage/저장 세션에 남기지 않는다", async () => {
    sendChatMock.mockResolvedValueOnce("ok");

    renderSolve();
    selectProviderAndKey();
    sendMessage("keep key out of storage");
    await screen.findByText("ok");

    // 저장 세션에는 대화 로그가 남지만 키는 없어야 한다.
    const session = getSession(TOKEN);
    expect(session?.messages.length).toBe(2);
    expect(JSON.stringify(session)).not.toContain(API_KEY);

    // localStorage 전체를 훑어도 키 문자열이 어디에도 없어야 한다.
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i)!;
      expect(window.localStorage.getItem(k)).not.toContain(API_KEY);
    }
  });
});
