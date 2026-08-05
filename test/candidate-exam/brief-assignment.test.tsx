/*
 * SC-2 / M-2 — 배정 문제 노출·격리 (렌더 계약)
 * ---------------------------------------------------------------------------
 * 검증 대상: 문제 안내 화면(BriefScreen)이 "해당 토큰에 배정된 문제 1건"의
 * 제목·설명만 표시하고, 다른 토큰에 배정된 문제는 노출하지 않는다.
 *
 * 결합 회피: 특정 문제 텍스트를 하드코딩하지 않고 프로덕션 계약(assignProblem)
 * 이 반환하는 값을 기준으로 검증한다. 검증하는 것은 "화면이 그 토큰의 배정
 * 결과를 그대로 보여주는가"이지, 특정 문자열이 화면에 있는가가 아니다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { assignProblem } from "../../src/app/session/problems";

/** 주어진 토큰의 brief 경로에서 BriefScreen을 렌더한다. */
function renderBriefFor(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}/brief`]}>
      <Routes>
        <Route path="/invite/:token/brief" element={<BriefScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

// 서로 다른 문제가 배정되는 두 토큰(고정 세트, 결정적 배정). 두 토큰이 정말
// 다른 문제를 받는지 먼저 확인해 테스트 전제를 방어한다 — 같은 문제라면
// 격리 검증이 의미를 잃는다.
const TOKEN_A = "token-a";
const TOKEN_B = "token-b";

describe("BriefScreen — 배정 문제 노출·격리 (SC-2/M-2)", () => {
  it("전제: 두 토큰에는 서로 다른 문제가 배정된다", () => {
    expect(assignProblem(TOKEN_A).id).not.toBe(assignProblem(TOKEN_B).id);
  });

  it("배정된 문제 1건의 제목과 설명이 화면에 표시된다", () => {
    const assigned = assignProblem(TOKEN_A);

    renderBriefFor(TOKEN_A);

    // 제목은 접근성 위계(heading)로도 노출된다.
    expect(
      screen.getByRole("heading", { name: assigned.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(assigned.description)).toBeInTheDocument();
  });

  it("다른 토큰의 문제는 노출되지 않는다 (렌더 격리)", () => {
    const otherAssigned = assignProblem(TOKEN_A);

    // TOKEN_B 화면을 렌더한다 — TOKEN_A에 배정된 문제는 이 스코프 밖이다.
    renderBriefFor(TOKEN_B);

    expect(screen.queryByText(otherAssigned.title)).not.toBeInTheDocument();
    expect(screen.queryByText(otherAssigned.description)).not.toBeInTheDocument();
  });
});
