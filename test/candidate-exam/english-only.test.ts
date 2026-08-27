/*
 * 언어 정책 — 사용자 대면 문자열은 영어 하나뿐
 * ---------------------------------------------------------------------------
 * 이 제품은 한국어를 지원하지 않는다. 화면에 나가는 모든 문구는 영어여야 하며,
 * 코드 주석(팀 내부 문서)만 한국어를 유지한다.
 *
 * 회귀가 조용히 스며드는 자리가 둘 있어 여기서 못박는다.
 *   1) 로케일 사전 — 새 키를 급히 넣다가 한국어가 섞이는 경우.
 *   2) 목업 문제 데이터 — i18n 사전 밖의 도메인 콘텐츠라 규약 검사에서 빠지기 쉽다.
 *
 * 사전 전체를 재귀로 훑어 한글 음절이 하나라도 있으면 실패시킨다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { defaultLocale, locales, strings } from "../../src/app/i18n";
import { PROBLEM_POOL } from "../../src/app/session/problems";

/** 한글 음절·자모 범위 */
const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;

/** 중첩 사전을 훑어 "경로 → 문자열" 목록으로 편다 */
function flatten(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === "string") return [[path.join("."), value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, [...path, key]),
    );
  }
  return [];
}

describe("언어 정책 — 영어 전용 (한국어 미지원)", () => {
  it("기본 로케일은 en이고, 등록된 로케일도 en 하나뿐이다", () => {
    expect(defaultLocale).toBe("en");
    expect(Object.keys(locales)).toEqual(["en"]);
  });

  it("로케일 사전의 모든 문구에 한글이 없다", () => {
    const offenders = flatten(strings)
      .filter(([, text]) => HANGUL.test(text))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("목업 문제 데이터(제목·설명)에도 한글이 없다", () => {
    const offenders = PROBLEM_POOL.filter(
      (problem) => HANGUL.test(problem.title) || HANGUL.test(problem.description),
    ).map((problem) => problem.id);
    expect(offenders).toEqual([]);
  });
});
