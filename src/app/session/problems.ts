/*
 * 배정 문제 목업 조회 — 토큰 → 문제 1건(결정적 배정)
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
    title: "신규 사용자 온보딩 이탈 줄이기",
    description:
      "신규 가입 후 첫 주 이탈률이 높은 SaaS 제품이 있습니다. 데이터를 어떻게 확인하고, 어떤 가설을 세워 무엇부터 개선할지 단계적으로 제안하세요.",
  },
  {
    id: "prob-incident-postmortem",
    title: "장애 사후 분석 설계",
    description:
      "결제 API가 30분간 간헐적으로 실패한 장애가 있었습니다. 원인 규명과 재발 방지를 위한 사후 분석(포스트모템)을 어떤 순서로 진행할지 구성하세요.",
  },
  {
    id: "prob-pricing-experiment",
    title: "가격 실험 설계",
    description:
      "구독 요금제를 새로 도입하려 합니다. 매출을 해치지 않으면서 최적 가격대를 찾기 위한 실험을 어떻게 설계하고 성공 지표를 무엇으로 둘지 설명하세요.",
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

/** 토큰에 배정된 문제 1건을 반환(같은 토큰 → 항상 같은 문제) */
export function assignProblem(token: string): Problem {
  const idx = hashToken(token) % PROBLEM_POOL.length;
  return PROBLEM_POOL[idx];
}
