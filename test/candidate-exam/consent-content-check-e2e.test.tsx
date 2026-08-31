/*
 * S-2 / M-2·M-3 — 동의 카피 콘텐츠 체크 (E2E)
 * ---------------------------------------------------------------------------
 * `consent-gate-e2e.test.tsx`의 렌더 패턴(프로덕션과 동형인 중첩 라우터 위에서
 * 실제 화면을 구동)을 재사용하되, 이 파일은 **콘텐츠와 배치**만 본다. 차단·진행
 * (M-1)이나 저장(M-4)은 다루지 않는다.
 *
 * 검증 목표(Measure) 대응:
 *   · M-2 — (a) 평가자가 해결 과정 내 입력·산출물까지 열람한다는 안내 문구가
 *           동의 화면에 렌더링된다(텍스트 100% 매칭).
 *   · M-3 — (b) 이 데이터를 LLM 원천 모델 학습 등에 쓰지 않는다는 고지 문구가
 *           (a)와 **같은 폼 안에 동시** 노출된다(텍스트 100% 매칭).
 *
 * 두 문장은 **동등 비중**으로 배치된다: 같은 `.verify-consent__statement` 클래스를
 * 달고, 같은 부모 아래 형제로 나란히 놓인다(어느 한쪽이 다른 쪽에 묻히지 않음 —
 * 페르소나 B). 문구는 모두 i18n(strings)에서 직접 읽어 하드코딩 없이 대조한다.
 * 이 테스트는 테스트 계층 전용이며 프로덕션 코드를 변경하지 않는다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { strings } from "../../src/app/i18n";

const TOKEN = "consent-content-check-e2e-token";
const verify = strings.screens.verify;

/** (a) 열람 안내 = consentReview, (b) 비학습 고지 = consentNoTraining.
 * 두 문구 모두 strings에서 직접 읽어 대조한다(하드코딩 금지). */
const COPY_A = verify.consentReview;
const COPY_B = verify.consentNoTraining;

/** 프로덕션과 동형인 중첩 라우트. 콘텐츠만 확인하므로 verify 인덱스만 렌더한다. */
function renderVerify() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}`]}>
      <Routes>
        <Route path="/invite/:token" element={<AppShell />}>
          <Route index element={<VerifyScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("동의 카피 콘텐츠 체크 E2E — (a)(b) 동시 노출·동등 비중 (S-2/M-2·M-3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("(a) 열람 안내 문구가 동의 화면에 렌더링된다 — 텍스트 100% 매칭 (M-2)", () => {
    renderVerify();
    // strings의 (a) 문구와 화면 텍스트가 정확히 일치하는 요소가 존재한다.
    const node = screen.getByText(COPY_A);
    expect(node).toBeInTheDocument();
    expect(node.textContent).toBe(COPY_A);
  });

  it("(b) 비학습 고지 문구가 동의 화면에 렌더링된다 — 텍스트 100% 매칭 (M-3)", () => {
    renderVerify();
    const node = screen.getByText(COPY_B);
    expect(node).toBeInTheDocument();
    expect(node.textContent).toBe(COPY_B);
  });

  it("(a)(b) 두 문구가 동일한 verify 폼 안에 동시 노출된다 (M-3 동시 노출 100%)", () => {
    const { container } = renderVerify();
    const form = container.querySelector("form.verify-form");
    expect(form).not.toBeNull();

    // 같은 폼으로 스코프를 좁혀도 (a)(b)가 둘 다 잡힌다 = 동일 화면 동시 노출.
    const scoped = within(form as HTMLElement);
    expect(scoped.getByText(COPY_A)).toBeInTheDocument();
    expect(scoped.getByText(COPY_B)).toBeInTheDocument();
  });

  it("(a)(b)가 같은 .verify-consent__statement 형제 구조로 동등 비중 배치된다 (페르소나 B)", () => {
    const { container } = renderVerify();

    // 동의 블록 안의 statement 노드만 뽑는다.
    const statements = Array.from(
      container.querySelectorAll<HTMLElement>(".verify-consent__statement"),
    );

    // 정확히 두 문장이 statement로 실린다(더도 덜도 아님).
    expect(statements).toHaveLength(2);

    // 두 노드의 텍스트가 각각 (a)(b) 문구와 100% 일치한다.
    const texts = statements.map((el) => el.textContent);
    expect(texts).toContain(COPY_A);
    expect(texts).toContain(COPY_B);

    // 동등 비중의 근거: 둘 다 같은 클래스이고, 같은 부모 아래 형제다
    // (한쪽이 다른 쪽에 종속/중첩되지 않는다).
    const [first, second] = statements;
    expect(first.className).toBe(second.className);
    expect(first.parentElement).not.toBeNull();
    expect(first.parentElement).toBe(second.parentElement);
    expect(first.tagName).toBe(second.tagName);
  });
});
