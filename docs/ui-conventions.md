# UI 규약 — 화면 카드 실행 에이전트용 단일 참조

이 문서는 이후 **화면 카드**(지원자용 응시 화면 등)를 만드는 에이전트가
실제로 참조하는 **단일 규약**이다. 색·형태·상태 표현이 화면마다 갈라지지 않도록,
새 UI를 쓰기 전에 아래 4개 축(토큰 · 프리미티브 · 셸/내비 · i18n)의 규칙을 그대로 따른다.

- **왜/무엇을**(톤·3대 디자인 원칙): 레포 루트 [`DESIGN.md`](../DESIGN.md).
- **얼마나**(시맨틱 값·구조의 정본): Design Spec = `$GENOSIS_SPEC_PATH/`
  (`index.md` · `convention.md` · `foundations/` · `token-groups/` · `components/`).
- **어떻게 코드로**: 이 문서 + 아래에 나열한 실제 파일/클래스/키.

> 원칙: 화면은 **값을 만들지 않고 참조만 한다.** 색·간격·서체는 토큰으로,
> 구조는 프리미티브로, 문구는 i18n 키로 참조한다. 새 값이 필요하면
> **Design Spec을 먼저 고치고** 코드가 뒤따른다 — 화면에서 즉흥적으로 정하지 않는다.

---

## 규칙 1 — 디자인 토큰: `var(--token)`만, 하드코딩 0

모든 색·서체·간격·모서리·그림자·테두리 두께 값은 **`var(--token)`로만** 참조한다.
원시값(hex, px, rem 등)을 화면·컴포넌트 CSS에 직접 쓰지 않는다.

- **단일 소스**: 토큰의 원시값은 오직 [`src/styles/tokens.css`](../src/styles/tokens.css)의
  `:root`에만 존재한다. 이 파일 밖에서 raw 값을 정의하거나 하드코딩하지 않는다.
- **값을 바꿔야 하면 base부터**: 토큰 값을 바꾸려면 `tokens.css`를 먼저 고치는 게 아니라
  **Design Spec의 해당 Token Group base를 먼저 수정**하고, 그 결정을 `tokens.css`에 반영한다.
  포맷 변환(`#2563eb` → `rgb(...)`)도 변형이므로 금지. 근거: `tokens.css`의 실제 토큰 목록.

  | Token Group | Spec base | 담당 축 |
  |---|---|---|
  | color | `$GENOSIS_SPEC_PATH/token-groups/color/base.md` | 색상만(surface·text·border·accent·status·overlay-scrim) |
  | typography | `$GENOSIS_SPEC_PATH/token-groups/typography/base.md` | font-family·size·weight·line-height·letter-spacing |
  | spacing | `$GENOSIS_SPEC_PATH/token-groups/spacing/base.md` | margin·gap·padding(간격 스케일) |
  | radius | `$GENOSIS_SPEC_PATH/token-groups/radius/base.md` | 모서리 둥글기 |
  | border | `$GENOSIS_SPEC_PATH/token-groups/border/base.md` | 테두리/외곽선 **두께**(border-width) |
  | shadow | `$GENOSIS_SPEC_PATH/token-groups/shadow/base.md` | 엘리베이션 그림자 |
  | sizing | `$GENOSIS_SPEC_PATH/token-groups/sizing/base.md` | 콘텐츠 컨테이너 최대 폭 |

- **네이밍**: 토큰 이름은 **시맨틱 역할**로만 짓는다(`convention.md`). 컴포넌트 고유명 금지
  (`chat-bubble-bg` ✗), 스케일은 `3xs<2xs<xs<sm<md<lg<xl<2xl<3xl<4xl` 어휘를 공유한다.
- **자주 쓰는 토큰(발췌 — 전체 목록은 `tokens.css`)**:
  - 배경: `--surface-base` `--surface-subtle` `--surface-muted` `--surface-inverse`
  - 텍스트: `--text-strong` `--text-default` `--text-muted` `--text-subtle` `--text-on-accent`
  - 경계색: `--border-subtle` `--border-default` `--border-strong` `--border-focus`
  - 강조: `--accent-default` `--accent-hover` `--accent-active` `--accent-subtle`
  - 상태: `--status-{success,warning,error,info}` (+ `-subtle` 배경 변형)
  - 간격: `--space-3xs … --space-4xl` · 크기: `--text-size-xs … --text-size-3xl`
  - 굵기: `--font-weight-{regular,medium,semibold,bold}` · 둥글기: `--radius-{none,sm,md,lg,xl,full}`
  - 두께: `--border-width-sm`(1px) `--border-width-md`(2px) · 그림자: `--shadow-{sm,md,lg,xl}`
  - 폭: `--container-width-{sm,md,lg}`
- **색 단독 전달 금지**(원칙 2): 상태는 색 + 텍스트/형태/아이콘을 **함께** 쓴다
  (예: 오류는 `--status-error` border + 오류 메시지 병기).
- **구현 설정값은 하드코딩 아님**: `display`·`position`·`flex`·`z-index`·`overflow`·
  `cursor`·transition/animation 타이밍·`aspect-ratio`·breakpoint 등 "값을 바꿔도 사용자가
  시각적으로 인지하지 못하는" 값은 토큰화하지 않고 리터럴로 쓴다. 예외를 쓸 땐 주석으로 근거를 남긴다.

---

## 규칙 2 — 공용 프리미티브: 정해진 클래스만 쓴다

새 버튼·입력·모달 등을 화면마다 새로 만들지 않는다. 아래 프리미티브 클래스를 **재사용**한다.
각 프리미티브의 정본 정의는 `$GENOSIS_SPEC_PATH/components/<name>/base.md`,
스타일은 [`src/styles/components/`](../src/styles/components/)에 있으며
모든 값은 `var(--token)`만 참조한다(하드코딩 0). 배럴 `components/index.css`가 6종을 한 번에 로드한다.

### 6종 기본 프리미티브

| 프리미티브 | 클래스 | 핵심 마크업 |
|---|---|---|
| **버튼** | `.btn` · `.btn--secondary` · `.btn--low-emphasis` | `<button class="btn">주요</button>` · 위계: primary(`.btn`) > secondary > low-emphasis. 아이콘은 `.btn__icon`. 주요 버튼은 화면당 하나(원칙 3). |
| **인풋** | `.input` · `.input--error` | `.input-field` 래퍼 안에 `.input-field__label` + `.input` + `.input-field__helper`/`.input-field__error`. 오류는 `.input--error` + 메시지 병기. |
| **모달** | `.modal` | `.modal-overlay`(스크림) > `.modal`[role=dialog] > `.modal__header`/`.modal__title`/`.modal__body`/`.modal__footer`. 열림/닫힘 토글 로직은 프리미티브 범위 밖. |
| **빈 상태** | `.empty-state` | `.empty-state__icon` + `.empty-state__title` + `.empty-state__description` + (선택) `.btn`. |
| **로딩** | `.spinner` · `.skeleton` | `.loading` 래퍼 안에 `.spinner`[role=status][aria-label] + `.loading__text`. 자리표시는 `.skeleton`. |
| **토스트** | `.toast` · `.toast--{success,warning,error,info}` | `.toast`[role=status] 안에 `.toast__icon` + `.toast__message` + (선택) `.toast__action`. 상태는 색 + 아이콘 + 텍스트 병행. |

### 참조 화면(문제 풀이=채팅) 3종 클래스

정본: `$GENOSIS_SPEC_PATH/components/{conversation,message-bubble,composer}/base.md`,
스타일: [`src/styles/chat.css`](../src/styles/chat.css). 채팅형 화면은 이 3종을 재사용한다.

| 클래스 | 역할 | 하위 요소 |
|---|---|---|
| `.conversation` | 대화 목록 컨테이너(상단 제공자 선택 슬롯 + 메시지 스택) | `.conversation__list` · `.conversation__pending` |
| `.message-bubble` · `.message-bubble--applicant` | 발화 말풍선(base=AI 무채색 / `--applicant`=지원자 `accent-subtle`) | `.message-bubble__author` · `__body` · `__meta` |
| `.composer` | 하단 입력 + 전송 묶음(`.input`·`.btn` 재사용) | `.composer__row` · `.composer__field` · `.composer__hint` |

> 새 컴포넌트가 필요하면 임의로 만들지 말고 `policy/reading.md`의 유사 판단
> (Variant / Extension / 신규)을 거쳐 **Design Spec에 먼저 등록**한다. 기존 프리미티브로
> 표현되면 그것을 쓴다(중복 방지). BYOP 제공자 선택은 `.provider-group*`(스타일:
> `src/app/styles/screens.css` + `chat.css`의 `.provider-group__connect*`)을 재사용한다.

---

## 규칙 3 — 레이아웃 셸 / 내비게이션

지원자 응시 흐름을 감싸는 공통 골격이다. 화면 카드는 셸 안에서 렌더되며, 셸/내비 자체를
새로 만들지 않고 아래 클래스를 재사용한다.

### 스타일 레이어 로드 순서 (고정)

진입점 [`src/app/main.tsx`](../src/app/main.tsx)가 아래 순서로 로드한다. 이 순서를 바꾸지 않는다.

1. `src/styles/tokens.css` — **토큰 원시값(먼저)**
2. `src/styles/components/index.css` — 6종 프리미티브
3. `src/styles/chat.css` — 참조 화면(채팅) Component
4. `src/app/styles/app-shell.css` — 레이아웃 셸
5. `src/app/styles/navigation.css` — 단계 표시자(stepper)
6. `src/app/styles/screens.css` — 흐름 화면 레이아웃 + `.provider-group*`

> 토큰이 항상 먼저 로드되어야 이후 모든 레이어의 `var(--token)`이 해석된다.

### 셸 클래스

- `.app-shell` > `.app-shell__header`(`.app-shell__brand` · `__product` · `__context`) +
  `.app-shell__main` > `.app-shell__container`.
- 넓은 폭(채팅 등)은 `.app-shell__container--wide`(= `--container-width-lg`).
  기본 컨테이너는 `--container-width-md`.
- 모달·토스트가 떠오르는 자리는 `.app-shell__overlay`.

### 내비게이션(단계 표시자)

- `.stepper` > `.stepper__item` (`.stepper__badge` + `.stepper__label`) + `.stepper__connector`.
- 상태 수식자: `.stepper__item--{done,current,upcoming}` / `.stepper__connector--{done,upcoming}`.
  상태는 색 단독이 아니라 형태(채움 vs 외곽선 배지)·번호·레이블·`.stepper__status-sr`(스크린리더)로 병행한다.
- 현재 단계 하나만 강조(원칙 3).

### 흐름 단계 (고정)

선형 4단계. 단일 정의는 [`src/app/flow.ts`](../src/app/flow.ts)의 `FLOW_STEPS`이며
라우터·stepper·화면 전환이 모두 이 배열을 공유한다(순서 산개 방지).

```
1. start (시작·안내)  →  2. connect (LLM 연결·선택)  →  3. solve (문제 풀이)  →  4. complete (제출 완료)
```

- `StepId = "start" | "connect" | "solve" | "complete"`. 경로는 `/start`·`/connect`·`/solve`·`/complete`.
- 단계 상태는 `stepStatus()` → `"done" | "current" | "upcoming"`. 다음/이전 이동은
  `nextStepPath()`·`prevStepPath()`. 새 화면은 이 흐름 정의에 단계를 추가하는 방식으로 배선한다.

### 웰컴 인트로 — 셸 밖 예외 레이어 (흐름 단계 아님)

초대 링크의 토큰 인덱스(`/invite/:token`)는 흐름 4단계가 아니라 **웰컴 인트로**가 차지한다.
전면(full-bleed) 히어로라 셸/내비 클래스를 쓰지 않는 **유일한 예외**이며, 나머지 규칙
(토큰만 · 프리미티브 재사용 · 문구는 키)은 그대로 적용된다.

- **위치**: 화면 [`src/app/screens/WelcomeScreen.tsx`], 파츠 `src/app/screens/welcome/`,
  스타일 [`src/app/styles/welcome.css`](../src/app/styles/welcome.css)(로드 순서 6번 뒤 7번).
- **클래스**: `.welcome` > `.welcome__sky` · `.welcome__canvas` · `.welcome__object` ·
  `.welcome__brand` · `.welcome__content` (`__eyebrow` · `__title` · `__description`).
  카피는 오브젝트 **위에 겹쳐** 가운데 정렬된다(참고 영상과 같은 구성) — 오브젝트를
  옆이나 아래로 밀어내는 별도 무대를 두지 않는다.
- **단계 표시자를 쓰지 않는다.** 인트로는 `FLOW_STEPS`에 없고 stepper에도 나타나지 않는다 —
  4단계 구조(`verify` → `brief` → `solve` → `complete`)는 그대로다. CTA의 목적지는
  `firstStepPath(token)`(= `/invite/:token/verify`)이고, 인트로 경로는 `welcomePath(token)`.
- **주요 버튼 하나**(원칙 3) — CTA는 프리미티브 `.btn`을 재사용하고 `.welcome__cta`는
  크기·엘리베이션만 얹는다. 건너뛰기·뒤로가기 같은 다른 액션을 두지 않는다.
- **모션 없는 경로를 항상 함께 만든다.** `prefers-reduced-motion: reduce` · WebGL 미지원 ·
  three 청크 로드 실패 어느 쪽이든 같은 카피·레이아웃에 정적 SVG 오브젝트로 대체된다.
- **배경 그림은 페인터 한 벌**(`screens/welcome/skyPainter.ts`)이 그린다. WebGL 씬 배경과
  DOM 캔버스(`SkyBackdrop`)가 같은 함수를 쓰므로 두 경로의 그림이 어긋나지 않는다.
  CSS로 구름을 따로 그리지 않는다 — 유리가 굴절시키려면 배경이 씬 안에 있어야 한다.

### 흐름 4단계도 같은 세계를 쓴다

셸(`AppShell`)은 같은 페인터의 **잔잔한 변형**(`variant="calm"`)을 `.app-shell__backdrop`에
깔고, 인트로와 같은 `BrandMark`를 헤더에 쓴다. 배경이 생긴 만큼 콘텐츠는 흰 카드 위에
올린다 — 새 카드를 만들지 말고 아래를 재사용한다.

| 자리 | 클래스 |
|---|---|
| 본인 확인 · 제출 완료 · 잠금 안내 | `.flow-panel` (empty-state/폼을 감싸는 흰 카드) |
| 배정 문제 | `.problem-brief` |
| 대화 · 작성창 · 제공자 선택 | `.conversation` · `.composer` · `.provider-group` |

### 버튼

`.btn`은 알약형(`--radius-full`)이다. 웰컴 인트로의 CTA만 `.btn--hero`로 입체(압출면 +
광채 + 아주 느린 기울임)를 얹고, 흐름 4단계의 버튼은 같은 형태를 쓰되 움직이지 않는다
(주요 초점은 화면당 하나 — 원칙 3). `.btn--hero`도 `prefers-reduced-motion`에서 멈춘다.

#### 신규 토큰 후보 (`--hero-*`)

하늘 그라디언트·구름·능선·유리 틴트·표제 크기·CTA 광채는 기존 토큰 체계(surface/text/
border/accent/status, text-size 스케일)로 표현되지 않는다. `tokens.css` 맨 아래의 **"신규 토큰
후보"** 블록에 `--hero-*`로 격리해 두었다.

- 후보라도 규칙 1은 그대로다 — 원시값은 `tokens.css`에만 두고, 화면·컴포넌트·three 씬은
  `var(--hero-*)`(또는 `getComputedStyle`로 읽은 같은 토큰)만 참조한다.
- A안이 채택되면 Design Spec의 `token-groups/color`·`sizing`에 정식 등록하고 "후보" 표기를
  지운다. 폐기되면 이 블록과 `welcome.css`·`screens/welcome/`을 함께 지운다.
- 예외: three 재질의 물리 파라미터(`transmission`·`ior`·`thickness` 등)와 카메라·조명
  좌표는 색·간격으로 인지되지 않는 **구현 설정값**이라 토큰화하지 않는다(승인된 모션
  에셋의 값을 그대로 옮긴 것).

---

---

## 규칙 4 — i18n: 문구는 키를 통해서만 (영어 전용)

사용자 대면 문자열(라벨·버튼·안내·에러·placeholder)을 코드에 **리터럴로 직접 쓰지 않는다.**
반드시 키를 참조한다. 규약 정본: `$GENOSIS_SPEC_PATH/foundations/i18n-strings.md`.

- **키 경유 사용**: 소비처는 `import { strings } from "../i18n"`(또는 하위 호환 `./strings`) 후
  `strings.<namespace>.<...>.<key>`로 참조한다. 예: `strings.screens.solve.sendAction`.
  배선 정본은 [`src/app/i18n/index.ts`](../src/app/i18n/index.ts).
- **리터럴 금지**: 화면·셸·흐름에 한국어(또는 어떤 언어) 문장을 그대로 쓰지 않는다.
  같은 의미의 문구는 하나의 키로 통합한다(문구 산개 방지).
- **영어 전용 · defaultLocale = en**: 이 제품은 **한국어를 지원하지 않는다.** 사용자 대면
  문자열은 전부 영어이며, 사전 정본은 [`src/app/i18n/locales/en.ts`](../src/app/i18n/locales/en.ts).
  `en`의 키 집합이 **정본(canonical) 키 세트**다. 코드 주석만 팀 내부 문서로서 한국어를 쓴다.
- **사전 밖 콘텐츠도 영어**: 목업 문제 데이터처럼 i18n 사전에 없는 도메인 텍스트도 영어로 둔다.
  회귀는 `test/candidate-exam/english-only.test.ts`가 막는다(사전·문제 풀에 한글이 섞이면 실패).
- **새 키는 en 먼저**: 키의 신설/삭제는 **`en`에서 먼저** 한다. 로케일을 추가하게 되면
  `en`과 **동일한 키 집합**을 번역으로 채운다(특정 로케일에만 있는 키 금지 — 폴백 불가 방지).
  키 타입 `Strings`는 `en` 구조에서 파생하므로 누락/오타는 컴파일 시점에 잡힌다.
- **네임스페이스 어휘**: `app`(제품/셸 공통) · `nav`(단계 표시자 접근성 라벨) ·
  `screens.<screen>`(화면 전용 — `welcome`/`verify`/`brief`/`solve`/`complete`) ·
  `providers`(제공자 표시명) · `fallback`(시스템 안내). 화면 문구 역할 접미사는
  `title`/`description`/`primaryAction`/`backAction`/`placeholder`/`hint`/`stepLabel` 등.
  키 이름에 실제 표시 문장을 넣지 않는다(값과 이름 분리).
- **새 화면 추가 시**: `screens.<newScreen>` 네임스페이스를 `ko`에 신설하고, 화면 간
  공통 문구는 `app`으로 올린다. 문구 톤은 `DESIGN.md`/`foundations/design-principles.md`의
  "신뢰감 있고 정돈된" B2B 채용 톤을 영어로 재사용한다 — 차분하고 명확하게, 과장 없이.

---

## 착수 절차 요약 (화면 카드 에이전트용)

1. **읽기**: `DESIGN.md`(톤·원칙) → `$GENOSIS_SPEC_PATH/index.md`(등록된 토큰·컴포넌트·Orphan) →
   관련 Token Group/Component base → 이 문서.
2. **audit**: `$GENOSIS_SPEC_PATH/audit/{오늘}.md`가 없으면 작업 전 감사(`policy/audit.md`).
   작업 범위 안 전면 불일치는 코딩 전 교정.
3. **코딩**: 규칙 1~4를 따른다 — 토큰만, 프리미티브 재사용, 셸/흐름 배선, 문구는 키.
   정의가 없으면 기존 패턴에 맞춰 만들고 **Design Spec에 기록**(`policy/recording.md`).
4. **기록**: 새 토큰/컴포넌트/변형이 생기면 `$GENOSIS_SPEC_PATH/`에 기록하고 `index.md` 갱신.

## 범위 밖(이 규약이 정하지 않는 것)

신규 토큰/프리미티브/화면 코드, 규칙을 강제하는 린트, 실제 LLM 연동, 다국어 번역 콘텐츠.
이 문서는 **참조 규약**이며 값을 새로 만들지 않는다 — 값의 정본은 Design Spec이다.
