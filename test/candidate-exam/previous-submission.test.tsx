/*
 * SC-4 / M-5 (개정) — 제출 후 재진입: 잠그지 않고 묻는다
 * ---------------------------------------------------------------------------
 * 예전 계약은 "제출 후 전 흐름 잠금"이었다. 지금은 막는 대신 **선택지를 준다**.
 * 이 파일이 지키는 것은 그 개정된 계약이다.
 *
 *   1) 제출 후 흐름의 어느 단계로 재진입해도(인덱스·/brief·/solve) 자식 화면
 *      대신 "지난 제출 안내"가 렌더된다 — 폼·채팅·재제출이 노출되지 않는다.
 *      (가드가 셸 계층에 있어 흐름 전체에 일괄 적용된다는 구조는 그대로다.)
 *   2) 지난 제출을 **읽어 볼 수 있다** — 펼치면 그때의 대화 로그가 그대로 나온다.
 *   3) "새 문제로 시작"을 고르면 다른 문제가 배정되고 대화가 비워지되,
 *      **지난 제출은 지워지지 않고** history에 남는다(평가 자료 보존).
 *   4) 제출 직후 목적지인 /complete는 예외로 그대로 도달한다.
 *
 * 스토어 계약(markSubmitted·appendMessage)은 실제 함수를 쓴다 — 이 grain은
 * 렌더 분기와 재시작의 부수효과만 다룬다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "../../src/app/shell/AppShell";
import { WelcomeScreen } from "../../src/app/screens/WelcomeScreen";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { CompleteScreen } from "../../src/app/screens/CompleteScreen";
import { strings } from "../../src/app/i18n";
import {
  appendMessage,
  getSession,
  markSubmitted,
} from "../../src/app/session/store";

const TOKEN = "previous-token";
const previous = strings.screens.previous;
const verify = strings.screens.verify;
const solve = strings.screens.solve;
const brief = strings.screens.brief;
const complete = strings.screens.complete;

/** 프로덕션과 동형인 중첩 라우트로 지정 경로를 렌더한다(AppShell = 레이아웃). */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}${path}`]}>
      <Routes>
        <Route path="/invite/:token">
          <Route index element={<WelcomeScreen />} />
          <Route element={<AppShell />}>
            <Route path="verify" element={<VerifyScreen />} />
            <Route path="brief" element={<BriefScreen />} />
            <Route path="solve" element={<SolveScreen />} />
            <Route path="complete" element={<CompleteScreen />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** 대화 2건을 남기고 제출까지 마친 세션을 만든다. */
function haveSubmittedSession() {
  appendMessage(TOKEN, "applicant", "내 첫 질문");
  appendMessage(TOKEN, "ai", "AI 답변", "gpt");
  markSubmitted(TOKEN);
}

/** 지난 제출 안내가 표시되었는지 확인한다. */
function expectPreviousNotice() {
  expect(
    screen.getByRole("heading", { name: previous.title }),
  ).toBeInTheDocument();
  expect(screen.getByText(previous.description)).toBeInTheDocument();
}

describe("제출 후 재진입 — 잠그지 않고 묻는다 (SC-4/M-5 개정)", () => {
  it("제출 전에는 안내가 뜨지 않는다 (풀이 화면 정상 렌더)", () => {
    renderAt("/verify");
    expect(
      screen.getByRole("heading", { name: verify.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: previous.title }),
    ).not.toBeInTheDocument();
  });

  it("제출 후 본인 확인 진입은 폼 대신 지난 제출 안내가 보인다", () => {
    haveSubmittedSession();
    renderAt("/verify");
    expectPreviousNotice();
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
  });

  it("제출 후 /brief 딥링크 진입도 지난 제출 안내로 대체된다", () => {
    haveSubmittedSession();
    renderAt("/brief");
    expectPreviousNotice();
    expect(
      screen.queryByRole("button", { name: brief.primaryAction }),
    ).not.toBeInTheDocument();
  });

  it("제출 후 /solve 딥링크는 채팅·재제출 없이 안내만 보인다", () => {
    haveSubmittedSession();
    renderAt("/solve");
    expectPreviousNotice();
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

  it("제출한 대화를 펼쳐서 그대로 되읽을 수 있다", () => {
    haveSubmittedSession();
    renderAt("/verify");

    // 펼치기 전에는 로그가 없다.
    expect(screen.queryByText("내 첫 질문")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: previous.viewAction }),
    );
    expect(screen.getByText("내 첫 질문")).toBeInTheDocument();
    expect(screen.getByText("AI 답변")).toBeInTheDocument();

    // 다시 접으면 사라지고, 버튼 문구도 상태를 함께 알린다(색 단독 금지).
    fireEvent.click(
      screen.getByRole("button", { name: previous.hideAction }),
    );
    expect(screen.queryByText("내 첫 질문")).not.toBeInTheDocument();
  });

  it("요약에 제출 시각·문제·대화 건수가 드러난다", () => {
    haveSubmittedSession();
    const { container } = renderAt("/verify");
    const session = getSession(TOKEN)!;

    // 단계 표시자의 숫자와 섞이지 않도록 요약 블록 안에서만 찾는다.
    const summary = container.querySelector(".previous__summary")!;
    const values = Array.from(
      summary.querySelectorAll(".previous__value"),
    ).map((el) => el.textContent);

    expect(values).toContain(session.problem.title);
    expect(values).toContain(String(session.messages.length));
    // 제출 시각이 "—"가 아니라 실제 값으로 채워져 있다.
    expect(values[0]).not.toBe("—");
  });

  it("'새 문제로 시작'은 다른 문제를 주되 지난 제출을 지우지 않는다", () => {
    haveSubmittedSession();
    const before = getSession(TOKEN)!;
    renderAt("/verify");

    fireEvent.click(
      screen.getByRole("button", { name: previous.restartAction }),
    );

    const after = getSession(TOKEN)!;
    // 새 회차 — 다른 문제, 빈 대화, 미제출 상태로 되돌아간다.
    expect(after.attempt).toBe(before.attempt + 1);
    expect(after.problem.id).not.toBe(before.problem.id);
    expect(after.messages).toEqual([]);
    expect(after.submittedAt).toBeNull();

    // 지난 제출은 지워지지 않고 history에 그대로 남는다(평가 자료 보존).
    expect(after.history).toHaveLength(1);
    expect(after.history[0].problem.id).toBe(before.problem.id);
    expect(after.history[0].messages.map((m) => m.text)).toEqual([
      "내 첫 질문",
      "AI 답변",
    ]);
    expect(after.history[0].submittedAt).toBe(before.submittedAt);
  });

  it("새로 시작하면 흐름이 다시 열린다 (본인 확인 폼 복귀)", () => {
    haveSubmittedSession();
    renderAt("/verify");
    fireEvent.click(
      screen.getByRole("button", { name: previous.restartAction }),
    );
    // 웰컴으로 이동 → CTA로 첫 단계에 들어가면 이제 폼이 보인다.
    fireEvent.click(
      screen.getByRole("button", {
        name: strings.screens.welcome.primaryAction,
      }),
    );
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: previous.title }),
    ).not.toBeInTheDocument();
  });

  it("제출 후에도 /complete는 예외로 정상 렌더된다", () => {
    haveSubmittedSession();
    renderAt("/complete");
    expect(
      screen.getByRole("heading", { name: complete.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: previous.title }),
    ).not.toBeInTheDocument();
  });

  it("헤더의 브랜드 마크는 처음(웰컴)으로 가는 링크다 — 제출 후에도", () => {
    haveSubmittedSession();
    renderAt("/verify");
    const home = screen.getByRole("link", { name: strings.app.homeLabel });
    expect(home).toHaveAttribute("href", `/invite/${TOKEN}`);
  });
});
