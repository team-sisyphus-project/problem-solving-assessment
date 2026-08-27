/*
 * 웰컴 인트로 — 흐름 앞단 진입 화면 계약
 * ---------------------------------------------------------------------------
 * 검증 대상(스펙 "주요 흐름"):
 *   1) 초대 링크의 토큰 인덱스(`/invite/:token`)에 본인 확인 폼이 아니라 웰컴
 *      인트로가 먼저 렌더된다 — eyebrow · 타이틀 · 서브카피 · 단일 CTA.
 *   2) 인트로는 흐름 단계가 아니다 — 단계 표시자(stepper)가 나타나지 않고,
 *      CTA 외의 액션(건너뛰기·뒤로가기)도 없다.
 *   3) CTA를 누르면 흐름의 첫 단계인 본인 확인(`/invite/:token/verify`)으로
 *      전진한다(기존 4단계 구조 불변).
 *   4) 이미 제출된 토큰으로 재진입하면 인트로 대신 흐름 첫 단계로 보내져
 *      셸 잠금 안내(SC-4/M-5)가 뜬다 — 끝난 응시에 환영 화면을 다시 보여 주지 않는다.
 *
 * 프로덕션 라우팅과 동형(인덱스=인트로, 셸 레이아웃 아래 4단계)으로 구성한다.
 * jsdom에는 WebGL이 없으므로 3D 오브젝트는 정적 대체로 내려가며, 이 테스트는
 * 3D 렌더 자체가 아니라 카피·이동·잠금 계약만 다룬다.
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
import { markSubmitted } from "../../src/app/session/store";
import { firstStepPath, welcomePath } from "../../src/app/flow";

const TOKEN = "welcome-token";
const welcome = strings.screens.welcome;
const verify = strings.screens.verify;

/** 프로덕션과 동형인 라우트 — 인덱스=인트로(셸 밖), 하위 4단계=셸 안 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
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

describe("웰컴 인트로 (흐름 4단계 앞단)", () => {
  it("초대 링크 진입 시 본인 확인이 아니라 인트로 카피가 먼저 보인다", () => {
    renderAt(welcomePath(TOKEN));

    expect(screen.getByText(welcome.eyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: welcome.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(welcome.description)).toBeInTheDocument();

    // 본인 확인 폼은 아직 등장하지 않는다.
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(verify.emailLabel)).not.toBeInTheDocument();
  });

  it("단계 표시자 없이 CTA 하나만 둔다(건너뛰기·뒤로가기 없음)", () => {
    renderAt(welcomePath(TOKEN));

    expect(
      screen.queryByRole("navigation", { name: strings.nav.ariaLabel }),
    ).not.toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(welcome.primaryAction);
  });

  it("CTA를 누르면 흐름 첫 단계(본인 확인)로 전진한다", () => {
    renderAt(welcomePath(TOKEN));

    fireEvent.click(screen.getByRole("button", { name: welcome.primaryAction }));

    // 본인 확인 화면 + 셸의 단계 표시자가 함께 등장한다.
    expect(
      screen.getByRole("heading", { name: verify.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: strings.nav.ariaLabel }),
    ).toBeInTheDocument();
  });

  it("본인 확인의 첫 단계 경로는 토큰 인덱스가 아닌 /verify다", () => {
    expect(firstStepPath(TOKEN)).toBe(`${welcomePath(TOKEN)}/verify`);
  });

  it("이미 제출된 토큰은 인트로 대신 잠금 안내로 대체된다", () => {
    markSubmitted(TOKEN);
    renderAt(welcomePath(TOKEN));

    expect(screen.queryByText(welcome.eyebrow)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: verify.lockTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(verify.lockDescription)).toBeInTheDocument();
  });

  it("모션·3D를 쓸 수 없어도 같은 카피와 CTA가 그대로 남는다(정적 대체)", () => {
    // jsdom에는 WebGL이 없어 GlassAsterisk가 정적 대체로 내려간 상태다.
    renderAt(welcomePath(TOKEN));

    expect(screen.getByRole("img", { name: welcome.visualLabel })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: welcome.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: welcome.primaryAction }),
    ).toBeInTheDocument();
  });
});
