/*
 * SC-4 / M-5 — 제출 후 전 흐름 잠금 강제 (공유 가드)
 * ---------------------------------------------------------------------------
 * 검증 대상: 제출(submittedAt 세팅) 이후에는 VerifyScreen 인덱스뿐 아니라
 * `/brief`·`/solve` 딥링크로 재진입해도 채팅/폼/재제출이 아니라 잠금 안내
 * (verify.lockTitle/lockDescription)만 렌더된다. 잠금은 AppShell 공유 가드로
 * 흐름 전체에 걸리되, 제출 직후 목적지인 `/complete`는 예외로 계속 도달 가능하다.
 *
 * 프로덕션 라우팅과 동형의 중첩 라우트(AppShell 레이아웃 + 4단계 자식)를
 * 구성해, "가드가 셸 계층에 있어 모든 자식 단계에 적용되는가"를 검증한다.
 * 스토어 계약(markSubmitted)은 실제 함수를 쓴다 — 이 grain은 렌더 분기만 다룬다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { CompleteScreen } from "../../src/app/screens/CompleteScreen";
import { strings } from "../../src/app/i18n";
import { markSubmitted } from "../../src/app/session/store";

const TOKEN = "lock-token";
const verify = strings.screens.verify;
const solve = strings.screens.solve;
const brief = strings.screens.brief;
const complete = strings.screens.complete;

/** 프로덕션과 동형인 중첩 라우트로 지정 경로를 렌더한다(AppShell = 레이아웃). */
function renderAt(path: string) {
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

/** 잠금 안내가 표시되었는지 확인한다. */
function expectLocked() {
  expect(
    screen.getByRole("heading", { name: verify.lockTitle }),
  ).toBeInTheDocument();
  expect(screen.getByText(verify.lockDescription)).toBeInTheDocument();
}

describe("제출 후 전 흐름 잠금 강제 (SC-4/M-5)", () => {
  it("제출 전에는 잠금이 걸리지 않는다 (풀이 화면 정상 렌더)", () => {
    renderAt("/solve");
    // 잠금 안내가 아니라 풀이 화면의 빈 대화 초기 상태가 보인다.
    expect(
      screen.getByRole("heading", { name: solve.emptyTitle }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: verify.lockTitle }),
    ).not.toBeInTheDocument();
  });

  it("제출 후 인덱스(본인 확인) 진입은 잠금 안내만 보인다", () => {
    markSubmitted(TOKEN);
    renderAt("");
    expectLocked();
    // 본인 확인 폼(이름/이메일)이 노출되지 않는다.
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
  });

  it("제출 후 /brief 딥링크 진입은 잠금 안내만 보인다", () => {
    markSubmitted(TOKEN);
    renderAt("/brief");
    expectLocked();
    // 문제 안내의 다음 단계 진행 버튼이 노출되지 않는다.
    expect(
      screen.queryByRole("button", { name: brief.primaryAction }),
    ).not.toBeInTheDocument();
  });

  it("제출 후 /solve 딥링크 진입은 채팅/재제출 없이 잠금 안내만 보인다", () => {
    markSubmitted(TOKEN);
    renderAt("/solve");
    expectLocked();
    // 채팅 composer·전송·재제출 액션이 모두 사라진다.
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

  it("제출 후에도 /complete는 예외로 정상 렌더된다", () => {
    markSubmitted(TOKEN);
    renderAt("/complete");
    expect(
      screen.getByRole("heading", { name: complete.title }),
    ).toBeInTheDocument();
    // 완료 화면은 잠금 안내가 아니다.
    expect(
      screen.queryByRole("heading", { name: verify.lockTitle }),
    ).not.toBeInTheDocument();
  });
});
