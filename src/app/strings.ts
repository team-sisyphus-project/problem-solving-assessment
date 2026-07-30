/*
 * 문자열 진입점 — 하위 호환 재-내보내기(shim)
 * ---------------------------------------------------------------------------
 * 문자열 관리는 로케일 키 파일 구조(`i18n/`)로 승격되었다. 정본은
 * `i18n/locales/<locale>.ts` 사전과 `i18n/index.ts` 접근자다.
 * 신규 소비처는 `../i18n`에서 직접 import 한다. 이 파일은 기존 경로
 * (`./strings`)를 깨지 않기 위한 얇은 재-내보내기만 유지한다.
 *
 * Spec: foundations/i18n-strings.md
 * ---------------------------------------------------------------------------
 */

export { strings, getStrings, t, defaultLocale, locales } from "./i18n";
export type { Strings, Locale } from "./i18n";
