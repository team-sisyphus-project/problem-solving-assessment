/*
 * BrandMark — 제품 마크(6갈래 별 글리프 + 워드마크)
 * ---------------------------------------------------------------------------
 * 웰컴 인트로의 3D 오브젝트와 같은 형태를 작은 글리프로 줄인 것이다. 인트로와
 * 흐름 4단계 화면이 같은 마크를 공유해, 전면 히어로에서 셸로 넘어가도 같은
 * 제품을 보고 있다는 인상이 끊기지 않는다.
 *
 * `tone`으로 두 배경을 모두 지원한다 — 짙은 하늘 위(`on-sky`)에서는 흰색,
 * 흰 헤더 위(`on-surface`)에서는 무채색 텍스트 토큰을 쓴다.
 *
 * `to`를 주면 링크가 된다. 헤더의 마크는 처음(웰컴)으로 돌아가는 문이며,
 * 제출을 마친 뒤에도 막히지 않는다 — 지원자가 언제든 첫 화면으로 나갈 수 있어야
 * 갇힌 느낌이 들지 않는다.
 * ---------------------------------------------------------------------------
 */

import { Link } from "react-router-dom";
import { strings } from "../i18n";

/** 6갈래 = 캡슐 3개 × 60° */
const ARM_ANGLES = [0, 60, 120];

interface BrandMarkProps {
  tone: "on-sky" | "on-surface";
  /** 주면 이 경로로 가는 링크가 된다. 없으면 단순 표시 */
  to?: string;
}

export function BrandMark({ tone, to }: BrandMarkProps) {
  const content = (
    <>
      <svg
        className="brand-mark__glyph"
        viewBox="0 0 24 24"
        role="presentation"
        focusable="false"
      >
        {ARM_ANGLES.map((angle) => (
          <rect
            key={angle}
            x="10.2"
            y="2.6"
            width="3.6"
            height="18.8"
            rx="1.8"
            fill="currentColor"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
      </svg>
      <span className="brand-mark__word">{strings.app.productName}</span>
    </>
  );

  if (!to) {
    return <span className={`brand-mark brand-mark--${tone}`}>{content}</span>;
  }

  return (
    <Link
      className={`brand-mark brand-mark--${tone} brand-mark--link`}
      to={to}
      aria-label={strings.app.homeLabel}
    >
      {content}
    </Link>
  );
}
