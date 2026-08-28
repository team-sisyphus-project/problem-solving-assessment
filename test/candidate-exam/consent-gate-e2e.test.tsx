/*
 * S-1 / M-1·M-2·M-3 — 본인 확인 데이터 열람 동의 게이트 (E2E)
 * ---------------------------------------------------------------------------
 * `submission-flow-e2e.test.tsx`와 동일한 방식으로, 프로덕션과 동형인 중첩
 * 라우터(AppShell = 레이아웃 + 단계 자식) 위에서 실제 클릭으로 구동한다.
 *
 * 검증 목표(Measure) 대응:
 *   · M-2 — 평가자가 해결 과정 내 입력·산출물까지 열람한다는 안내가 노출된다.
 *   · M-3 — 이 데이터를 LLM 학습 등에 쓰지 않는다는 고지가 (a)안내와 **같은 화면에
 *           동시** 노출된다.
 *   · M-1 — 미동의 상태에서 진행 시도 시 다음 단계(brief)로 넘어가지 못하고
 *           안내가 노출된다(차단 100%). 동의 후에는 진행에 성공한다(진행 100%).
 *
 * 문구는 i18n(strings)에서 직접 읽어 하드코딩 없이 대조하고, 배정 문제 제목은
 * 프로덕션 계약(assignProblem)이 반환하는 값으로 확인해 특정 문자열 결합을 피한다.
 * 이 테스트는 테스트 계층 전용이며 프로덕션 코드를 변경하지 않는다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { strings } from "../../src/app/i18n";
import { assignProblem } from "../../src/app/session/problems";
import { getSession } from "../../src/app/session/store";

const TOKEN = "consent-gate-e2e-token";
const verify = strings.screens.verify;

/** 프로덕션과 동형인 중첩 라우트로 렌더한다. verify 인덱스에서 시작하고,
 * 동의 통과 후 brief로 실제 navigate가 일어나므로 brief 라우트도 포함한다. */
function renderFlow() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}`]}>
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
    target: { value: "Jordan Lee" },
  });
  fireEvent.change(screen.getByLabelText(verify.emailLabel), {
    target: { value: "jordan@example.com" },
  });
}

const proceedButton = () =>
  screen.getByRole("button", { name: verify.primaryAction });
const consentCheckbox = () =>
  screen.getByRole("checkbox", { name: verify.consentCheckboxLabel });

describe("본인 확인 동의 게이트 E2E — 노출·차단·진행 (S-1/M-1·M-2·M-3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("동의 문구 (a)열람 안내 + (b)비학습 고지가 체크박스·진행 버튼과 같은 화면에 동시 노출된다 (M-2/M-3)", () => {
    const { container } = renderFlow();

    // 같은 verify 폼 안에 (a)(b) 두 고지가 함께 실린다(동시 노출).
    const form = container.querySelector("form.verify-form");
    expect(form).not.toBeNull();
    const scoped = within(form as HTMLElement);
    expect(scoped.getByText(verify.consentReview)).toBeInTheDocument();
    expect(scoped.getByText(verify.consentNoTraining)).toBeInTheDocument();

    // 동의 컨트롤(체크박스)과 진행 버튼도 같은 폼 안에 함께 있다.
    expect(
      scoped.getByRole("checkbox", { name: verify.consentCheckboxLabel }),
    ).toBeInTheDocument();
    expect(
      scoped.getByRole("button", { name: verify.primaryAction }),
    ).toBeInTheDocument();
  });

  it("미동의 상태에서 진행을 시도하면 brief로 넘어가지 못하고 안내가 노출된다 (M-1 차단, 페르소나 C)", () => {
    renderFlow();
    fillIdentity();

    // 기본 상태: 체크 안 됨, 버튼은 비활성 상태를 알린다.
    expect(consentCheckbox()).not.toBeChecked();
    expect(proceedButton()).toHaveAttribute("aria-disabled", "true");

    // 안내는 시도 전에는 떠 있지 않다(불필요한 경고를 미리 띄우지 않는다).
    expect(screen.queryByText(verify.consentRequired)).not.toBeInTheDocument();

    // 미동의 상태로 진행 시도 — 안내가 뜨고 다음 단계로 넘어가지 않는다.
    fireEvent.click(proceedButton());

    expect(screen.getByText(verify.consentRequired)).toBeInTheDocument();
    // 여전히 본인 확인 폼에 머문다 — 배정 문제(brief) 화면은 나타나지 않는다.
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    const assigned = assignProblem(TOKEN);
    expect(
      screen.queryByRole("heading", { name: assigned.title }),
    ).not.toBeInTheDocument();
    // 신원도 아직 세션에 저장되지 않았다(게이트 통과 전).
    expect(getSession(TOKEN)?.candidate).toBeNull();
  });

  it("동의 체크 후 진행하면 안내가 사라지고 다음 단계(brief)로 넘어간다 (M-1 진행)", () => {
    renderFlow();
    fillIdentity();

    // 먼저 미동의로 막히고 안내가 떠 있는 상태를 만든다.
    fireEvent.click(proceedButton());
    expect(screen.getByText(verify.consentRequired)).toBeInTheDocument();

    // 동의하면 비활성 표시와 안내가 함께 사라진다.
    fireEvent.click(consentCheckbox());
    expect(consentCheckbox()).toBeChecked();
    expect(proceedButton()).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText(verify.consentRequired)).not.toBeInTheDocument();

    // 진행 — 배정 문제(brief)로 전진하고 본인 확인 폼은 사라진다.
    fireEvent.click(proceedButton());

    const assigned = assignProblem(TOKEN);
    expect(
      screen.getByRole("heading", { name: assigned.title }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    // 신원이 세션에 저장되었다.
    expect(getSession(TOKEN)?.candidate).toMatchObject({
      name: "Jordan Lee",
      email: "jordan@example.com",
    });
  });
});
