/*
 * WelcomeScreen — 웰컴 인트로 (`/invite/:token`, 흐름 4단계 앞단)
 * ---------------------------------------------------------------------------
 * Spec: 웰컴 인트로 — 임팩트 3D 버전(A안)
 *   components/button/base.md    (단일 CTA)
 *   foundations/i18n-strings.md  (screens.welcome 네임스페이스)
 *
 * 초대 링크로 처음 들어온 지원자가 본인 확인 폼을 마주치기 **전에** 만나는 환영
 * 한 장이다. 목적은 첫인상을 "표준화 시험"이 아니라 "가볍게 초대받은 자리"로
 * 바꾸는 것 하나뿐이라, 화면에는 카피 한 묶음과 CTA 하나만 둔다(건너뛰기·
 * 뒤로가기 없음 — 스펙의 단일 액션 가정).
 *
 * 흐름 단계가 아니다. FLOW_STEPS에도, 단계 표시자에도 나타나지 않으며 셸
 * (AppShell) 밖에서 전면 히어로로 렌더된다. 기존 4단계 구조는 그대로다.
 *
 * 화면 구성은 참고 영상과 같은 **겹침** 구조다 — 하늘·구름 배경 위에 3D
 * 오브젝트가 뜨고, 그 앞에 eyebrow → 타이틀 → 서브카피 → CTA가 가운데 정렬로
 * 얹힌다. 오브젝트를 카피 옆이나 아래에 따로 두지 않기 때문에, 같은 크기라도
 * 화면을 압도하지 않고 배경 오브제로 읽힌다.
 *
 * 모션·3D를 못 쓰는 환경(prefers-reduced-motion · WebGL 미지원 · 로드 실패)에서는
 * 같은 카피·레이아웃을 유지한 채 오브젝트만 정적 SVG로 대체된다(스펙 흐름 5).
 *
 * 제출 후 잠금(SC-4/M-5)은 셸 계층 가드의 몫이라 인트로에는 잠금 UI가 없다.
 * 대신 이미 제출된 토큰이면 인트로를 건너뛰고 흐름 첫 단계로 보내, 셸이 잠금
 * 안내를 띄우게 한다 — 끝난 응시에 환영 화면을 다시 보여 주지 않기 위해서다.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { firstStepPath } from "../flow";
import { strings } from "../i18n";
import { isSubmitted } from "../session/store";
import { BrandMark } from "../shell/BrandMark";
import { GlassAsterisk } from "./welcome/GlassAsterisk";
import { SkyBackdrop } from "./welcome/SkyBackdrop";
import { StaticAsterisk } from "./welcome/StaticAsterisk";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** 현재 환경이 모션 축소를 요구하는지 구독한다(설정 변경도 즉시 반영) */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // jsdom 등 matchMedia가 없는 환경에서는 모션 있음(기본)으로 둔다.
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.welcome;

  const prefersReducedMotion = usePrefersReducedMotion();
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  // 모션 축소 요청이거나 3D를 띄울 수 없으면 정적 오브젝트로 대체한다.
  const useStaticObject = prefersReducedMotion || webglUnavailable;

  // 이미 제출된 초대 링크 — 인트로를 건너뛰고 흐름 첫 단계(셸 잠금 안내)로.
  if (isSubmitted(token)) {
    return <Navigate to={firstStepPath(token)} replace />;
  }

  return (
    <div className="welcome">
      {/* 바탕 하늘 — 3D가 뜨면 그 위를 덮지만, 대체 경로에서는 이 그림이 남는다 */}
      <SkyBackdrop variant="hero" className="welcome__sky" />

      {useStaticObject ? (
        <div className="welcome__object" aria-hidden="true">
          <StaticAsterisk />
        </div>
      ) : (
        <GlassAsterisk onUnavailable={() => setWebglUnavailable(true)} />
      )}

      <header className="welcome__brand">
        <BrandMark tone="on-sky" />
      </header>

      <main className="welcome__content">
        {/* 오브젝트 위에 겹치는 카피 — 이 화면의 실제 초점 */}
        <p className="welcome__eyebrow">{s.eyebrow}</p>
        <h1 className="welcome__title">{s.title}</h1>
        <p className="welcome__description">{s.description}</p>

        <button
          type="button"
          className="btn btn--hero"
          onClick={() => navigate(firstStepPath(token))}
        >
          {s.primaryAction}
        </button>
      </main>

      {/* 장식 오브젝트의 접근성 이름 — 시각 요소를 스크린리더에도 한 줄로 알린다 */}
      <span className="visually-hidden">{s.visualLabel}</span>
    </div>
  );
}
