/*
 * S-1 / M-1·M-2·M-3 — 본인 확인 단계 데이터 열람 동의 게이트 (E2E)
 * ---------------------------------------------------------------------------
 * 검증 대상(프로덕션 동형 라우터 위에서 실제 클릭으로 구동):
 *   1) 본인 확인 화면에 동의 문구(두 고지) + 체크박스 + 진행 버튼이 함께 노출된다
 *      (M-2: 해결 과정 열람 안내, M-3: LLM 비학습 고지 — 같은 화면 동시 노출).
 *   2) 이름·이메일을 채워도 동의 체크가 없으면 "Confirm and start"가 다음 단계
 *      (문제 안내 brief)로 진행하지 않고 안내 메시지를 띄운다(M-1: 차단 + 페르소나 C).
 *   3) 체크 후 클릭하면 신원이 세션에 저장되고 문제 안내로 전진한다(M-1: 진행).
 *
 * 문구/톤은 i18n(strings)에서 직접 읽어 하드코딩 없이 대조한다. 배정 문제 텍스트는
 * 프로덕션 계약(assignProblem)이 반환하는 값으로 확인해 특정 문자열 결합을 피한다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { strings } from "../../src/app/i18n";
import { assignProblem } from "../../src/app/session/problems";
import { getSession } from "../../src/app/session/store";

const TOKEN = "consent-gate-token";
const verify = strings.screens.verify;

/** 프로덕션과 동형인 중첩 라우트(AppShell = 레이아웃 + 자식 단계)로 렌더한다.
 * verify 인덱스에서 시작해 동의 통과 후 brief로 실제 navigate가 일어나므로
 * brief 라우트도 포함한다. */
function renderFlowAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}${path}`]}>
      <Routes>
        <Route path="/invite/:token" element={<AppShell />}>
          <Route index element={<VerifyScreen />} />
          <Route path="brief" element={<BriefScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** 이름·이메일을 유효하게 채운다(동의는 하지 않는다). */
function fillIdentity() {
  fireEvent.change(screen.getByLabelText(verify.nameLabel), {
    target: { value: "Alex Morgan" },
  });
  fireEvent.change(screen.getByLabelText(verify.emailLabel), {
    target: { value: "alex@example.com" },
  });
}

describe("본인 확인 동의 게이트 — 노출·차단·진행 (S-1/M-1·M-2·M-3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("동의 화면에 두 고지 문구 + 체크박스 + 진행 버튼이 함께 노출된다 (M-2/M-3)", () => {
    renderFlowAt("");

    // (a) 해결 과정 열람 안내와 (b) LLM 비학습 고지가 같은 화면에 동시 노출.
    expect(screen.getByText(verify.consentReview)).toBeInTheDocument();
    expect(screen.getByText(verify.consentNoTraining)).toBeInTheDocument();

    // 체크박스(동의 컨트롤)와 진행 버튼이 함께 있다.
    expect(
      screen.getByRole("checkbox", { name: verify.consentCheckboxLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: verify.primaryAction }),
    ).toBeInTheDocument();
  });

  it("동의 체크 없이 진행하면 차단되고 안내가 뜬다 (M-1 차단, 페르소나 C)", () => {
    renderFlowAt("");
    fillIdentity();

    // 체크박스는 기본 미선택, 버튼은 비활성 상태를 알린다.
    const checkbox = screen.getByRole("checkbox", {
      name: verify.consentCheckboxLabel,
    });
    expect(checkbox).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: verify.primaryAction }),
    ).toHaveAttribute("aria-disabled", "true");

    // 미동의 상태에서 진행 시도 — 안내가 뜨고 문제 안내로 넘어가지 않는다.
    fireEvent.click(screen.getByRole("button", { name: verify.primaryAction }));

    expect(screen.getByText(verify.consentRequired)).toBeInTheDocument();
    // 여전히 본인 확인 화면(폼)이고, 배정 문제 화면은 나타나지 않는다.
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    const assigned = assignProblem(TOKEN);
    expect(
      screen.queryByRole("heading", { name: assigned.title }),
    ).not.toBeInTheDocument();
    // 신원도 아직 저장되지 않았다.
    expect(getSession(TOKEN)?.candidate).toBeNull();
  });

  it("동의 체크 후 진행하면 신원이 저장되고 문제 안내로 넘어간다 (M-1 진행)", () => {
    renderFlowAt("");
    fillIdentity();

    fireEvent.click(
      screen.getByRole("checkbox", { name: verify.consentCheckboxLabel }),
    );
    // 동의하면 버튼의 비활성 표시가 사라진다.
    expect(
      screen.getByRole("button", { name: verify.primaryAction }),
    ).not.toHaveAttribute("aria-disabled");

    fireEvent.click(screen.getByRole("button", { name: verify.primaryAction }));

    // 배정 문제(brief)로 전진 — 배정 계약이 반환한 문제 제목이 화면에 뜬다.
    const assigned = assignProblem(TOKEN);
    expect(
      screen.getByRole("heading", { name: assigned.title }),
    ).toBeInTheDocument();
    // 본인 확인 폼은 더 이상 없다.
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    // 신원이 세션에 저장되었다.
    expect(getSession(TOKEN)?.candidate).toMatchObject({
      name: "Alex Morgan",
      email: "alex@example.com",
    });
  });
});
