# UI Conventions — Single Reference for Screen-Card Execution Agents

This document is the **single set of conventions** actually referenced by agents
building future **screen cards** (such as the candidate exam screens). To keep
color, shape, and state expression from diverging between screens, follow the
rules across the four axes below (tokens, primitives, shell/nav, i18n) exactly
as written before writing any new UI.

- **Why / what** (tone, the three design principles): repo root
  [`DESIGN.md`](../DESIGN.md).
- **How much** (source of truth for semantic values and structure): Design Spec =
  `$GENOSIS_SPEC_PATH/`
  (`index.md` · `convention.md` · `foundations/` · `token-groups/` · `components/`).
- **How, in code**: this document + the actual files/classes/keys listed below.

> Principle: screens **reference values, never create them.** Colors, spacing,
> and typography are referenced through tokens, structure through primitives,
> and copy through i18n keys. If a new value is needed, **fix the Design Spec
> first** and let the code follow — never decide it ad hoc on the screen.

---

## Rule 1 — Design Tokens: `var(--token)` Only, Zero Hardcoding

Every color, typography, spacing, corner radius, shadow, and border-width value
is referenced **only via `var(--token)`**. Never write raw values (hex, px, rem,
etc.) directly in screen or component CSS.

- **Single source**: token raw values exist only in the `:root` of
  [`src/styles/tokens.css`](../src/styles/tokens.css). Do not define or hardcode
  raw values outside this file.
- **To change a value, start from base**: to change a token value, do not edit
  `tokens.css` first — **modify the corresponding Token Group base in the Design
  Spec first**, then reflect that decision in `tokens.css`. Format conversion
  (`#2563eb` → `rgb(...)`) is also a modification and therefore forbidden.
  Ground truth: the actual token list in `tokens.css`.

  | Token Group | Spec base | Axis covered |
  |---|---|---|
  | color | `$GENOSIS_SPEC_PATH/token-groups/color/base.md` | color only (surface·text·border·accent·status·overlay-scrim) |
  | typography | `$GENOSIS_SPEC_PATH/token-groups/typography/base.md` | font-family·size·weight·line-height·letter-spacing |
  | spacing | `$GENOSIS_SPEC_PATH/token-groups/spacing/base.md` | margin·gap·padding (spacing scale) |
  | radius | `$GENOSIS_SPEC_PATH/token-groups/radius/base.md` | corner rounding |
  | border | `$GENOSIS_SPEC_PATH/token-groups/border/base.md` | border/outline **thickness** (border-width) |
  | shadow | `$GENOSIS_SPEC_PATH/token-groups/shadow/base.md` | elevation shadows |
  | sizing | `$GENOSIS_SPEC_PATH/token-groups/sizing/base.md` | content container max width |

- **Naming**: token names are based on **semantic role** only (`convention.md`).
  No component-specific names (`chat-bubble-bg` ✗); scales share the vocabulary
  `3xs<2xs<xs<sm<md<lg<xl<2xl<3xl<4xl`.
- **Frequently used tokens (excerpt — full list in `tokens.css`)**:
  - Backgrounds: `--surface-base` `--surface-subtle` `--surface-muted` `--surface-inverse`
  - Text: `--text-strong` `--text-default` `--text-muted` `--text-subtle` `--text-on-accent`
  - Border colors: `--border-subtle` `--border-default` `--border-strong` `--border-focus`
  - Accent: `--accent-default` `--accent-hover` `--accent-active` `--accent-subtle`
  - Status: `--status-{success,warning,error,info}` (+ `-subtle` background variants)
  - Spacing: `--space-3xs … --space-4xl` · Sizes: `--text-size-xs … --text-size-3xl`
  - Weights: `--font-weight-{regular,medium,semibold,bold}` · Radius: `--radius-{none,sm,md,lg,xl,full}`
  - Thickness: `--border-width-sm` (1px) `--border-width-md` (2px) · Shadows: `--shadow-{sm,md,lg,xl}`
  - Widths: `--container-width-{sm,md,lg}`
- **Never convey state through color alone** (Principle 2): state uses color
  **together with** text/shape/icon (e.g., an error uses a `--status-error`
  border plus an error message alongside).
- **Implementation settings are not hardcoding**: values that "users cannot
  visually perceive if changed" — `display`, `position`, `flex`, `z-index`,
  `overflow`, `cursor`, transition/animation timing, `aspect-ratio`,
  breakpoints, etc. — are not tokenized and are written as literals. When using
  an exception, leave a comment stating the rationale.

---

## Rule 2 — Shared Primitives: Use Only the Established Classes

Do not build new buttons, inputs, modals, etc. from scratch for each screen.
**Reuse** the primitive classes below. The canonical definition of each
primitive lives at `$GENOSIS_SPEC_PATH/components/<name>/base.md`, the styles in
[`src/styles/components/`](../src/styles/components/), and every value
references only `var(--token)` (zero hardcoding). The barrel
`components/index.css` loads all six at once.

### The 6 Base Primitives

| Primitive | Classes | Core markup |
|---|---|---|
| **Button** | `.btn` · `.btn--secondary` · `.btn--low-emphasis` | `<button class="btn">Primary</button>` · hierarchy: primary (`.btn`) > secondary > low-emphasis. Icons use `.btn__icon`. One primary button per screen (Principle 3). |
| **Input** | `.input` · `.input--error` | Inside an `.input-field` wrapper: `.input-field__label` + `.input` + `.input-field__helper`/`.input-field__error`. Errors use `.input--error` plus a message alongside. |
| **Modal** | `.modal` | `.modal-overlay` (scrim) > `.modal`[role=dialog] > `.modal__header`/`.modal__title`/`.modal__body`/`.modal__footer`. Open/close toggle logic is outside the primitive's scope. |
| **Empty state** | `.empty-state` | `.empty-state__icon` + `.empty-state__title` + `.empty-state__description` + (optional) `.btn`. |
| **Loading** | `.spinner` · `.skeleton` | Inside a `.loading` wrapper: `.spinner`[role=status][aria-label] + `.loading__text`. Placeholders use `.skeleton`. |
| **Toast** | `.toast` · `.toast--{success,warning,error,info}` | Inside `.toast`[role=status]: `.toast__icon` + `.toast__message` + (optional) `.toast__action`. State uses color + icon + text together. |

### The 3 Reference-Screen (Problem Solving = Chat) Classes

Canonical:
`$GENOSIS_SPEC_PATH/components/{conversation,message-bubble,composer}/base.md`,
styles: [`src/styles/chat.css`](../src/styles/chat.css). Chat-style screens
reuse these three.

| Class | Role | Child elements |
|---|---|---|
| `.conversation` | Conversation list container (provider-select slot on top + message stack) | `.conversation__list` · `.conversation__pending` |
| `.message-bubble` · `.message-bubble--applicant` | Utterance bubble (base = AI achromatic / `--applicant` = candidate `accent-subtle`) | `.message-bubble__author` · `__body` · `__meta` |
| `.composer` | Bottom input + send group (reuses `.input` and `.btn`) | `.composer__row` · `.composer__field` · `.composer__hint` |

> If a new component is needed, do not create one arbitrarily — run the
> similarity assessment in `policy/reading.md` (Variant / Extension / New) and
> **register it in the Design Spec first**. If an existing primitive can express
> it, use that (avoid duplication). BYOP provider selection reuses
> `.provider-group*` (styles: `src/app/styles/screens.css` +
> `.provider-group__connect*` in `chat.css`).

---

## Rule 3 — Layout Shell / Navigation

The shared skeleton wrapping the candidate exam flow. Screen cards render inside
the shell; do not rebuild the shell/nav itself — reuse the classes below.

### Style Layer Load Order (Fixed)

The entry point [`src/app/main.tsx`](../src/app/main.tsx) loads in the order
below. Do not change this order.

1. `src/styles/tokens.css` — **token raw values (first)**
2. `src/styles/components/index.css` — the 6 primitives
3. `src/styles/chat.css` — reference-screen (chat) Component
4. `src/app/styles/app-shell.css` — layout shell
5. `src/app/styles/navigation.css` — step indicator (stepper)
6. `src/app/styles/screens.css` — flow-screen layout + `.provider-group*`

> Tokens must always load first so that `var(--token)` resolves in every
> subsequent layer.

### Shell Classes

- `.app-shell` > `.app-shell__header` (`.app-shell__brand` · `__product` ·
  `__context`) + `.app-shell__main` > `.app-shell__container`.
- Wide widths (chat, etc.) use `.app-shell__container--wide`
  (= `--container-width-lg`). The default container is `--container-width-md`.
- Modals and toasts rise inside `.app-shell__overlay`.

### Navigation (Step Indicator)

- `.stepper` > `.stepper__item` (`.stepper__badge` + `.stepper__label`) +
  `.stepper__connector`.
- State modifiers: `.stepper__item--{done,current,upcoming}` /
  `.stepper__connector--{done,upcoming}`. State is conveyed not by color alone
  but in parallel through shape (filled vs. outlined badge), number, label, and
  `.stepper__status-sr` (screen reader).
- Only the current step is emphasized (Principle 3).

### Flow Steps (Fixed)

A linear four-step flow. The single definition is `FLOW_STEPS` in
[`src/app/flow.ts`](../src/app/flow.ts); the router, stepper, and screen
transitions all share this array (prevents order drift).

```
1. start (start / brief)  →  2. connect (LLM connection / selection)  →  3. solve (problem solving)  →  4. complete (submission complete)
```

- `StepId = "start" | "connect" | "solve" | "complete"`. Paths are `/start`,
  `/connect`, `/solve`, `/complete`.
- Step state is `stepStatus()` → `"done" | "current" | "upcoming"`. Next/prev
  navigation uses `nextStepPath()` and `prevStepPath()`. New screens are wired
  in by adding a step to this flow definition.

### Welcome Intro — Exception Layer Outside the Shell (Not a Flow Step)

The token index of the invite link (`/invite/:token`) is occupied not by the
four-step flow but by the **welcome intro**. As a full-bleed hero it is the
**only exception** that does not use the shell/nav classes; all other rules
(tokens only, primitive reuse, copy via keys) still apply.

- **Location**: screen [`src/app/screens/WelcomeScreen.tsx`], parts in
  `src/app/screens/welcome/`, styles in
  [`src/app/styles/welcome.css`](../src/app/styles/welcome.css) (load order:
  7th, after the 6th).
- **Classes**: `.welcome` > `.welcome__sky` · `.welcome__canvas` ·
  `.welcome__object` · `.welcome__brand` · `.welcome__content` (`__eyebrow` ·
  `__title` · `__description`). The copy is **overlaid on top of** the object,
  center-aligned (same composition as the reference video) — there is no
  separate stage that pushes the object aside or below.
- **No step indicator.** The intro is not in `FLOW_STEPS` and does not appear in
  the stepper — the four-step structure
  (`verify` → `brief` → `solve` → `complete`) is unchanged. The CTA's
  destination is `firstStepPath(token)` (= `/invite/:token/verify`), and the
  intro path is `welcomePath(token)`.
- **One primary button** (Principle 3) — the CTA reuses the `.btn` primitive,
  and `.welcome__cta` adds only size and elevation. No other actions such as
  skip or back.
- **Always build the motion-free path alongside.** Under
  `prefers-reduced-motion: reduce`, when WebGL is unsupported, or when the three
  chunk fails to load, the same copy and layout are kept with a static SVG
  object substituted.
- **The background drawing comes from one set of painters**
  (`screens/welcome/skyPainter.ts`). The WebGL scene background and the DOM
  canvas (`SkyBackdrop`) use the same functions, so the two paths never drift
  apart. Do not draw clouds separately in CSS — for the glass to refract it, the
  background must live inside the scene.

### The Four Flow Steps Share the Same World

The shell (`AppShell`) lays the same painter's **calm variant**
(`variant="calm"`) on `.app-shell__backdrop` and uses the same `BrandMark` as
the intro in the header. Since there is now a background, content sits on white
cards — do not create new cards; reuse the ones below.

| Slot | Class |
|---|---|
| Identity verification · submission complete · lock notice | `.flow-panel` (white card wrapping empty-state/forms) |
| Assigned problem | `.problem-brief` |
| Conversation · composer · provider selection | `.conversation` · `.composer` · `.provider-group` |

### Flow Screens With Staging (Identity Verification, Problem Solving)

Only these two screens use a two-column layout and motion. Styles are in
[`src/app/styles/flow-screens.css`](../src/app/styles/flow-screens.css) (load
order: 7th); components are in `src/app/screens/verify/` and
`src/app/screens/solve/`.

| Slot | Class |
|---|---|
| Identity verification, two columns | `.split-panel` > (`.scan` \| `.split-panel__form`) |
| Scan effect | `.scan` > `.scan__label` · `.scan__layer--{blur,sharp}` > `.scan__stage` > `.scan__text` > `.scan__word(--active)` |
| Solving, phase 1 | `.solve-connect` (`.solve-phase-label` · `__title` · `__lead` · `__body` · `__privacy` · `__actions`) |
| Solving, phase 2 | `.solve-layout` > (`.solve-aside` + `.solve-main`) |
| Left rail | `.solve-aside` > `.drifting-clouds` + `.solve-aside__content` > `.solve-timer` |
| Problem pin | `.problem-pin` (`__head` · `__heading` · `__eyebrow` · `__title` · `__body`) |

- **The scan effect stacks two layers.** Below is the blurred base, above is the
  sharp band. The band (mask) is **fixed to panel coordinates** and only the
  text flows upward — moving the mask would put it out of sync with the text.
- **The paragraph is not decoration.** To screen readers it reads as an ordinary
  paragraph; the word spans exist only for the effect.
- **The two solving phases are not flow steps.** `FLOW_STEPS` remains four; the
  sub-phase is announced only by `.solve-phase-label` ("Step 1 of 2") — kept
  small so it is not confused with the step indicator (stepper).
- **Elapsed time is not a countdown.** This is a place that examines process,
  not answers, so time pressure would conflict with the purpose. Only a
  counting-up clock is shown, with copy stating "no time limit" alongside.
- **All motion stops under `prefers-reduced-motion`** — the scan neither tilts
  nor flows, and the clouds stand still. Sentences and information remain
  unchanged.

### Re-entry After Submission — Previous Submission Notice

The shell guard renders `PreviousSubmission` instead of a lock. Classes:
`.previous` (= `.flow-panel`) > `.previous__summary`
(`__row` · `__term` · `__value`) · `.previous__log` · `.previous__restart`.

- **Never delete the previous submission.** "Start with a new problem" is not an
  overwrite but a move into `history`. The copy (`restartBody`) states that fact
  up front — it must not read as if anything will be erased.
- **No warning colors.** Nothing is lost, so there is no reason to alarm anyone
  (achromatic + divider).
- **The brand mark is a link.** Giving `BrandMark` a `to` prop makes it
  `.brand-mark--link` and returns to the start. Not blocked even after
  submission.
- **Dates and times are printed in the app locale.** Calling `toLocaleString()`
  with no arguments mixes in Korean characters on Korean-language browsers —
  pass `defaultLocale` explicitly (the english-only test guards against
  regressions).

### Buttons

`.btn` is pill-shaped (`--radius-full`). Only the welcome intro's CTA layers on
dimensionality via `.btn--hero` (extruded face + glow + very slow tilt); buttons
in the four flow steps use the same shape but do not move (one primary focus per
screen — Principle 3). `.btn--hero` also stops under `prefers-reduced-motion`.

#### New Token Candidates (`--hero-*`)

The sky gradient, clouds, ridgeline, glass tint, headline size, and CTA glow
cannot be expressed with the existing token system
(surface/text/border/accent/status, text-size scale). They are isolated as
`--hero-*` in the **"new token candidates"** block at the very bottom of
`tokens.css`.

- Even as candidates, Rule 1 still applies — raw values live only in
  `tokens.css`, and screens, components, and the three scene reference only
  `var(--hero-*)` (or the same tokens read via `getComputedStyle`).
- If option A is adopted, register them formally in the Design Spec's
  `token-groups/color` and `sizing` and remove the "candidate" marking. If
  discarded, delete this block together with `welcome.css` and
  `screens/welcome/`.
- Exception: the physics parameters of the three material (`transmission`,
  `ior`, `thickness`, etc.) and the camera/lighting coordinates are
  **implementation settings** not perceived as color or spacing, so they are not
  tokenized (they are carried over verbatim from the approved motion asset).

---

---

## Rule 4 — i18n: Copy Only Through Keys (English Only)

User-facing strings (labels, buttons, notices, errors, placeholders) are
**never written as literals in code.** Always reference a key. Canonical
convention: `$GENOSIS_SPEC_PATH/foundations/i18n-strings.md`.

- **Use via keys**: consumers do `import { strings } from "../i18n"` (or the
  backward-compatible `./strings`) and reference
  `strings.<namespace>.<...>.<key>`. Example: `strings.screens.solve.sendAction`.
  The wiring's source of truth is
  [`src/app/i18n/index.ts`](../src/app/i18n/index.ts).
- **No literals**: never write Korean (or any language's) sentences verbatim in
  screens, the shell, or the flow. Consolidate copy with the same meaning into a
  single key (prevents copy drift).
- **English only · defaultLocale = en**: this product **does not support
  Korean.** All user-facing strings are English, and the canonical dictionary is
  [`src/app/i18n/locales/en.ts`](../src/app/i18n/locales/en.ts). The key set of
  `en` is the **canonical key set**. Only code comments use Korean, as internal
  team documentation.
- **Content outside the dictionary is also English**: domain text not in the
  i18n dictionary, such as mock problem data, is kept in English too.
  Regressions are guarded by `test/candidate-exam/english-only.test.ts` (fails
  if Korean characters slip into the dictionary or problem pool).
- **New keys go into en first**: keys are created/deleted **in `en` first**. If
  a locale is ever added, fill it with translations of **the identical key
  set** as `en` (no keys existing only in a particular locale — prevents
  impossible fallbacks). The key type `Strings` is derived from the `en`
  structure, so omissions/typos are caught at compile time.
- **Namespace vocabulary**: `app` (product/shell-wide) · `nav` (step-indicator
  accessibility labels) · `screens.<screen>` (screen-specific —
  `welcome`/`verify`/`brief`/`solve`/`complete`) · `providers` (provider display
  names) · `fallback` (system notices). Role suffixes for screen copy include
  `title`/`description`/`primaryAction`/`backAction`/`placeholder`/`hint`/`stepLabel`,
  etc. Never put the actual display sentence in a key name (separate value from
  name).
- **When adding a new screen**: create the `screens.<newScreen>` namespace in
  `ko`, and promote copy shared across screens up to `app`. For copy tone, reuse
  the "trustworthy and well-organized" B2B hiring tone of
  `DESIGN.md`/`foundations/design-principles.md` in English — calm and clear,
  without exaggeration.

---

## Kickoff Procedure Summary (For Screen-Card Agents)

1. **Read**: `DESIGN.md` (tone, principles) → `$GENOSIS_SPEC_PATH/index.md`
   (registered tokens, components, Orphans) → the relevant Token
   Group/Component base → this document.
2. **Audit**: if `$GENOSIS_SPEC_PATH/audit/{today}.md` does not exist, audit
   before working (`policy/audit.md`). Fix any across-the-board mismatches
   within the work scope before coding.
3. **Code**: follow Rules 1–4 — tokens only, primitive reuse, shell/flow wiring,
   copy via keys. If a definition is missing, build it following existing
   patterns and **record it in the Design Spec** (`policy/recording.md`).
4. **Record**: when a new token/component/variant is created, record it in
   `$GENOSIS_SPEC_PATH/` and update `index.md`.

## Out of Scope (What This Convention Does Not Define)

New token/primitive/screen code, lint rules enforcing the conventions, actual
LLM integration, multilingual translation content. This document is a
**reference convention** and creates no values — the source of truth for values
is the Design Spec.
