/*
 * i18n 배선 — 로케일 레지스트리 · 접근자 (Headless)
 * ---------------------------------------------------------------------------
 * Spec: foundations/i18n-strings.md
 *
 * 사용자 대면 문자열을 로케일 키 파일(`locales/<locale>.ts`)로 관리하는 최소
 * 배선이다. 현재 로케일은 `ko` 하나뿐이지만, 새 로케일 추가 = `ko`와 동형(같은
 * 키 집합)인 사전 파일 추가 + `locales`에 등록으로 확장된다. i18n 라이브러리·
 * 번들 로딩·전환 UI는 이번 범위 밖(규약이 그 골격만 고정).
 *
 *   - `defaultLocale` : 기준/폴백 로케일(= ko)
 *   - `locales`       : 로케일 코드 → 사전 레지스트리
 *   - `Strings`       : ko 사전에서 파생한 정본(canonical) 키 타입
 *   - `getStrings(l)` : 로케일의 사전 전체를 반환(없으면 defaultLocale 폴백)
 *   - `t(l)`          : `getStrings`의 짧은 별칭
 *   - `strings`       : `getStrings(defaultLocale)` — 소비처 기본 진입점
 * ---------------------------------------------------------------------------
 */

import { ko } from "./locales/ko";

/** 기준(정본) 로케일 — 키 누락 시 폴백 대상이자 현재 유일한 로케일 */
export const defaultLocale = "ko" as const;

/**
 * 로케일 레지스트리 — 코드 → 사전.
 * 새 로케일은 `ko`와 동일한 키 집합을 가진 파일을 만들어 여기에 등록한다.
 */
export const locales = {
  ko,
} as const;

/** 사용 가능한 로케일 코드 */
export type Locale = keyof typeof locales;

/**
 * 정본 키 타입 — `ko` 사전 구조에서 파생한다. 모든 로케일은 이 형태를 만족해야
 * 하므로(동형 강제) 새 사전 파일에 이 타입을 부여하면 키 누락/오타가 컴파일
 * 시점에 잡힌다.
 */
export type Strings = typeof ko;

/**
 * 로케일 사전 전체를 반환한다. 등록되지 않은 로케일이면 `defaultLocale`로
 * 폴백한다(키 누락 폴백의 최소 형태).
 */
export function getStrings(locale: Locale = defaultLocale): Strings {
  return locales[locale] ?? locales[defaultLocale];
}

/** `getStrings`의 짧은 별칭 — 소비처에서 로케일 사전 접근용 */
export const t = getStrings;

/**
 * 기본 로케일 사전에 대한 바인딩 — 로케일 전환 UI가 없는 현재, 화면·셸·흐름의
 * 기본 진입점이다. 문구는 반드시 이 키를 통해 참조하고 리터럴을 직접 쓰지 않는다.
 */
export const strings = getStrings(defaultLocale);
