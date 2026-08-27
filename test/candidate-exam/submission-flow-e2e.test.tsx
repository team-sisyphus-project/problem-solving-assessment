/*
 * SC-4 / M-4·M-5 — 제출 흐름 E2E (모달 → 확정 → 완료 → 재진입 잠금)
 * ---------------------------------------------------------------------------
 * 검증 대상(프로덕션 동형 라우터 위에서 실제 클릭으로 구동):
 *   1) 풀이 화면에서 대화를 나눈 뒤 "제출하기"를 누르면 즉시 제출되지 않고
 *      제출 확인 모달이 뜬다(되돌릴 수 없는 액션의 한 번 더 확인).
 *   2) 모달에서 "최종 제출"을 눌러야 비로소 전체 대화 로그와 제출 시각
 *      (submittedAt)이 스토어에 확정되고(M-4) 제출 완료 화면으로 전진한다.
 *   3) 같은 초대 링크(`/invite/{token}`) 및 `/solve` 딥링크로 재접속하면
 *      문제/채팅이 아니라 "이미 제출된 응시입니다" 잠금 안내만 표시된다(SC-4/M-5).
 *
 * 어댑터 경계(sendChat, grain-1)는 목킹한다 — 이 테스트는 라우터 흐름(모달·완료·
 * 재진입 잠금)을 구동/단언하고, 실제 REST 호출은 어댑터 테스트가 이미 다룬다.
 * 문구/톤은 i18n(strings)에서 직접 읽어 스펙 기록과 대조한다(하드코딩 금지).
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// 어댑터 경계 목킹 — sendChat만 제어하고 나머지(LlmError 등)는 실제를 쓴다.
const { sendChatMock } = vi.hoisted(() => ({ sendChatMock: vi.fn() }));
vi.mock("../../src/app/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/llm")>();
  return { ...actual, sendChat: sendChatMock };
});

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { CompleteScreen } from "../../src/app/screens/CompleteScreen";
import { strings } from "../../src/app/i18n";
import { getSession, isSubmitted } from "../../src/app/session/store";

const TOKEN = "e2e-submit-token";
const API_KEY = "sk-e2e-secret-key";
const solve = strings.screens.solve;
const modal = strings.screens.solve.submitModal;
const complete = strings.screens.complete;
const verify = strings.screens.verify;
const previous = strings.screens.previous;

/** 프로덕션과 동형인 중첩 라우트(AppShell = 레이아웃 + 4단계 자식)로 렌더한다.
 * "최종 제출" 확정 후 navigate(/complete)가 실제로 일어나므로 완료 라우트도 포함. */
function renderFlowAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}${path}`]}>
      <Routes>
        <Route path="/invite/:token" element={<AppShell />}>
          <Route index element={<VerifyScreen />} />
          <Route path="brief" element={<BriefScreen />} />
          <Route path="solve" element={<SolveScreen />} />
          <Route path="complete" element={<CompleteScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** 제공자 선택 → 본인 키 입력 → 메시지 1건 전송(응답 누적)까지 대화를 만든다. */
async function haveConversation() {
  fireEvent.click(screen.getByRole("button", { name: strings.providers.gpt }));
  fireEvent.change(
    screen.getByLabelText(`${strings.providers.gpt} ${solve.keyFieldLabel}`),
    { target: { value: API_KEY } },
  );
  // 풀이는 1단계(본인 AI 연결) → 2단계(대화)로 나뉜다 — 연결 후 대화로 넘어간다.
  fireEvent.click(
    screen.getByRole("button", { name: solve.phaseConnectAction }),
  );
  fireEvent.change(screen.getByLabelText(solve.composerPlaceholder), {
    target: { value: "풀이 질문" },
  });
  fireEvent.click(screen.getByRole("button", { name: solve.sendAction }));
  expect(await screen.findByText("AI 응답")).toBeInTheDocument();
}

/** 지난 제출 안내(막지 않고 묻는 화면)가 표시되었는지 확인한다. */
function expectLocked() {
  expect(
    screen.getByRole("heading", { name: previous.title }),
  ).toBeInTheDocument();
  expect(screen.getByText(previous.description)).toBeInTheDocument();
  // 막는 화면이 아니다 — 다시 시작할 문이 함께 있다.
  expect(
    screen.getByRole("button", { name: previous.restartAction }),
  ).toBeInTheDocument();
}

describe("제출 흐름 E2E — 모달 → 확정 → 완료 → 재진입 잠금 (SC-4/M-4·M-5)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendChatMock.mockReset();
    sendChatMock.mockResolvedValue("AI 응답");
  });

  it('"제출하기"는 즉시 제출하지 않고 확인 모달을 띄운다', async () => {
    renderFlowAt("/solve");
    await haveConversation();

    // 아직 제출 전 — 잠기지 않았고 모달도 닫혀 있다.
    expect(isSubmitted(TOKEN)).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));

    // 확인 모달이 뜬다(제목·본문·취소/확정 액션이 스펙 문구와 일치).
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: modal.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(modal.body)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: modal.confirmAction }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: modal.cancelAction }),
    ).toBeInTheDocument();

    // 모달만 떴을 뿐 아직 제출은 확정되지 않았다.
    expect(isSubmitted(TOKEN)).toBe(false);
    expect(getSession(TOKEN)?.submittedAt).toBeNull();
  });

  it('"최종 제출" 확정 시 대화 로그·제출 시각이 저장되고 완료 화면이 표시된다 (M-4)', async () => {
    renderFlowAt("/solve");
    await haveConversation();

    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.confirmAction }));

    // 완료 화면으로 전진한다(모달은 닫힘).
    expect(
      await screen.findByRole("heading", { name: complete.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(complete.description)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // M-4: 전체 대화 로그(순서·시각)와 제출 시각이 스토어에 확정된다.
    const session = getSession(TOKEN);
    expect(session?.submittedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(session!.submittedAt!))).toBe(false);
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages[0]).toMatchObject({
      role: "applicant",
      text: "풀이 질문",
    });
    expect(session?.messages[1]).toMatchObject({ role: "ai", text: "AI 응답" });
    expect(session?.messages.every((m) => typeof m.at === "string")).toBe(true);
    expect(isSubmitted(TOKEN)).toBe(true);
  });

  it("제출 후 같은 초대 링크(인덱스)로 재접속하면 지난 제출 안내가 뜬다 (SC-4/M-5 개정)", async () => {
    renderFlowAt("/solve");
    await haveConversation();
    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.confirmAction }));
    await screen.findByRole("heading", { name: complete.title });

    // 브라우저 재접속을 재렌더로 모사(스토어는 localStorage로 영속).
    renderFlowAt("");

    expectLocked();
    // 본인 확인 폼(문제 화면 진입)이 노출되지 않는다.
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: verify.primaryAction }),
    ).not.toBeInTheDocument();
  });

  it("제출 후 /solve 딥링크로 재접속해도 채팅/재제출 없이 지난 제출 안내가 뜬다 (SC-4/M-5 개정)", async () => {
    renderFlowAt("/solve");
    await haveConversation();
    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.confirmAction }));
    await screen.findByRole("heading", { name: complete.title });

    renderFlowAt("/solve");

    expectLocked();
    // 채팅 composer·전송·재제출 액션이 모두 사라진다(재응시 불가).
    expect(
      screen.queryByLabelText(solve.composerPlaceholder),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: solve.sendAction }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: solve.primaryAction }),
    ).not.toBeInTheDocument();
  });

  it("모달에서 '돌아가기'를 누르면 제출되지 않고 풀이 화면으로 돌아온다", async () => {
    renderFlowAt("/solve");
    await haveConversation();

    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.cancelAction }));

    // 모달이 닫히고 제출은 성립하지 않는다(잠기지 않음, 풀이 화면 유지).
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(isSubmitted(TOKEN)).toBe(false);
    expect(
      screen.getByRole("button", { name: solve.primaryAction }),
    ).toBeInTheDocument();
  });
});
