/*
 * 배정 문제 목업 조회 — 토큰 → 문제 1건(결정적 배정)
 *
 * NOTE(언어): 이 제품의 사용자 대면 언어는 영어 하나뿐이다(한국어 미지원).
 * 목업 문제 텍스트도 지원자가 읽는 콘텐츠이므로 영어로만 둔다.
 * ---------------------------------------------------------------------------
 * 실제 서비스에서는 고객사가 등록한 문제 또는 플랫폼 기본 세트 중 서버가 배정한
 * 문제 1건을 토큰으로 조회한다(배정 로직 자체는 고객사 화면 스펙 소관). 이 골격
 * grain은 백엔드/API 없이 **목업 조회**만 제공한다: 토큰 문자열을 결정적으로
 * 해싱해 고정 풀에서 문제 1건을 배정한다(같은 토큰 → 항상 같은 문제, M-2).
 *
 * NOTE: 문제 제목/설명은 서버가 내려주는 **도메인 데이터**(응답 페이로드)이지
 * 화면 크롬(UI 라벨)이 아니다. 따라서 i18n 키 사전이 아니라 이 목업 데이터
 * 모듈에 둔다. 실제 연동 시 이 모듈이 API 조회로 교체된다.
 * ---------------------------------------------------------------------------
 */

export interface Problem {
  /** 문제 식별자 */
  id: string;
  /** 문제 제목 */
  title: string;
  /** 문제 설명(요구사항) */
  description: string;
}

/** 목업 문제 풀 — 실제 연동 전까지 배정 대상이 되는 고정 세트 */
export const PROBLEM_POOL: readonly Problem[] = [
  {
    id: "prob-onboarding-funnel",
    title: "Reduce drop-off in new-user onboarding",
    description:
      "A SaaS product loses a large share of new users within their first week. Walk through how you would look at the data, what hypotheses you would form, and what you would try to fix first.",
  },
  {
    id: "prob-incident-postmortem",
    title: "Design an incident postmortem",
    description:
      "A payments API failed intermittently for thirty minutes. Lay out how you would run the postmortem: finding the cause, and making sure it does not happen again.",
  },
  {
    id: "prob-pricing-experiment",
    title: "Design a pricing experiment",
    description:
      "A team is introducing subscription tiers for the first time. Describe the experiment you would run to find the right price without damaging revenue, and the metrics you would judge it by.",
  },
];

/** 토큰 문자열을 결정적 해시로 변환(부호 없는 32비트) */
function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * 토큰에 배정된 문제 1건을 반환한다.
 *
 * 같은 토큰·같은 회차면 항상 같은 문제다(M-2). 이전 제출을 두고 새로 시작하면
 * 회차(attempt)가 올라가고, 그만큼 풀에서 다음 문제로 옮겨 간다 — 같은 문제를
 * 다시 받으면 "새로 시작"이 아니라 재시도가 되어 버리기 때문이다. 풀을 한 바퀴
 * 다 돌면 다시 처음으로 돌아온다(풀 크기만큼만 서로 다른 문제를 줄 수 있다).
 */
export function assignProblem(token: string, attempt = 0): Problem {
  const idx = (hashToken(token) + attempt) % PROBLEM_POOL.length;
  return PROBLEM_POOL[idx];
}
