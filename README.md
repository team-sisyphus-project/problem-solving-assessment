# Problem-Solving Assessment — Candidate Exam Screens (Skeleton)

This is the frontend for the **candidate-facing exam screens** of a hiring SaaS
for problem-solving assessment in the AI era. At this stage, the layout shell of
the exam flow and the screen-transition skeleton are wired up. The actual
chat/problems/scoring, LLM key integration, and client-company screens will be
handled in follow-up cards.

## Language Policy — English Only

This product's user-facing language is **English only (Korean is not supported)**.
All screen copy lives in a single file, `src/app/i18n/locales/en.ts`, and the
i18n `defaultLocale` is also `en`. Domain content outside the dictionary, such
as the mock problem data (`src/app/session/problems.ts`), is kept in English as
well. Only code comments remain in Korean, as internal team documentation.

Regressions are prevented by `test/candidate-exam/english-only.test.ts` — it
sweeps the entire dictionary and mock problems and fails if even one Korean
character slips in.

## Stack

- Vite + React + TypeScript (static build → SPA served on a single port)
- Client-side routing: `react-router-dom` (HashRouter — deep links keep working
  even on static deployments, without any server fallback configuration)
- 3D: `three` — used only for the glass object in the welcome intro. It is
  isolated into a separate chunk via dynamic import, so it is never loaded on
  the four flow-step screens.

## Welcome Intro (Precedes the Flow — Not a Step)

The token index of the invite link (`/#/invite/{token}`) is not the identity
verification form but a single **welcome intro** page. A glass 3D object sits on
a sky/clouds/hills background, with only an eyebrow → title → subcopy → single
CTA. Pressing the CTA advances to the first step of the flow (identity
verification).

- Because it is not a flow step, it does not appear in `FLOW_STEPS` or the step
  indicator, and it renders as a full-bleed hero **outside** the shell
  (AppShell). The existing four-step structure is unchanged.
- The background (sky, cumulus clouds, ridgeline) is drawn by a single set of
  painters in `screens/welcome/skyPainter.ts`. That is because the WebGL scene
  background and the DOM canvas share the same drawing — for the glass object to
  **refract** the sky, the background has to live inside the scene.
- The copy is **overlaid on top of** the object, center-aligned. Because it does
  not push the object aside or below, the object reads as a background objet
  rather than dominating the screen even at the same size.
- The CTA is `.btn--hero` — a dimensional pill shape that floats, tilting very
  slowly. Buttons in the four flow steps use the same pill shape but do not move
  (one primary focus per screen).
- Under `prefers-reduced-motion: reduce`, when WebGL is unsupported, or when the
  three chunk fails to load, only the object is replaced with a static SVG while
  the same copy and layout are kept.
- Re-entering with a token that has already been submitted skips the intro and
  sends the candidate to the first step, where the shell's lock notice appears.
- Hero-only visual values (sky, clouds, hills, glass tint, headline size) are
  isolated in the **new-token candidates** block at the bottom of `tokens.css` —
  a temporary home until they are registered in the Design Spec.

## Exam Flow (4 Steps, Scoped to the Invite Token)

The entire flow is nested under the invite link `/#/invite/{token}`. The shell's
header step indicator and the router share the linear flow below; there are no
sign-up/login/LLM-connection steps.

1. **Identity verification** (`/#/invite/{token}/verify`) — two-column layout.
   The left side is a scan effect that sweeps down through the assigned problems
   (`screens/verify/ProblemScan`); the right side is the name/email input.
2. **Problem brief** (`/#/invite/{token}/brief`) — introduces the single
   assigned problem
3. **Problem solving** (`/#/invite/{token}/solve`) — split into two phases
   **within** the screen.
   - Phase 1 `connect`: explains what the assessment looks at and connects the
     candidate's own AI (BYOP). It can be skipped, but skipping means the
     conversation cannot be started (that fact is stated next to the button).
   - Phase 2 `chat`: the left side shows elapsed time plus drifting clouds; the
     right side is the conversation. The assigned problem is pinned above the
     conversation (`ProblemPin`) and can be collapsed/expanded; the title
     remains even when collapsed.
   - Returning to a session that already has a conversation skips Phase 1 and
     goes straight to the chat.
   - Elapsed time is **not a time limit** (not a countdown). Its reference point
     is the session's `startedAt`, so it does not reset to zero on refresh.
4. **Submission complete** (`/#/invite/{token}/complete`) — the flow's terminal
   state

### Re-entry After Submission — Ask Instead of Locking

Previously, re-entering via a submitted link **locked** the flow with an
"Already submitted" message. Now, instead of blocking, we show the previous
submission notice (`screens/PreviousSubmission`) and offer choices.

- It shows a summary of what was submitted and when; expanding it lets the
  candidate re-read the conversation log from that time as-is.
- Choosing "Start with a new problem" increments the attempt counter
  (`attempt`), assigns a **different problem**, and clears the conversation.
- **The previous submission is never deleted.** It is moved to the session's
  `history` — we promised that submissions are irreversible, and they are also
  assessment material the reviewer will examine, so a new attempt must not
  overwrite it.
- The brand mark in the header is a link back to the start (welcome). It is not
  blocked even after submission — candidates should always be able to return to
  the first screen so they never feel trapped.
- The only exception is `/complete`, the destination right after submission,
  which remains directly reachable.

> With this revision, a single invite link allows multiple attempts (originally
> SC-4/M-5 limited it to one). If cheating must be prevented, revert to limiting
> attempts on the server side.

- The four flow-step screens also lay down the same sky as the intro, in a
  **calm variant**. It seeps in faintly only at the bottom of the screen, and
  the content sits on white cards (`.flow-panel`, `.problem-brief`,
  `.conversation`), so the readability of forms and conversations is unaffected
  by the background.
- The token session (name/email, assigned problem, conversation log, submission
  time) is stored per token in the browser's localStorage (backend integration
  is a follow-up card).
- The token-less root (`/`) and unknown paths redirect to the demo token's
  welcome intro (`/#/invite/demo-2f9c4a`) (preview continuity). Unknown
  sub-paths within a token redirect to that token's first step rather than the
  intro — so that mid-flow deep links do not bounce back to the beginning
  (deep-link fallback).

## Greenfield Local Run

There is no database, no migrations, no seeds (static frontend SPA). From a
clean state:

```bash
npm install     # install dependencies
npm run dev     # dev server (uses the PORT env var, default 5173)
```

Production preview:

```bash
npm run build   # typecheck + static build → dist/
npm run preview # serve dist/ on PORT (default 5173)
```

- The port comes from the `PORT` environment variable first (no hardcoding).
- No dummy accounts/seeds (auth and data layers are out of scope for now).

## Code Layout

- `src/styles/tokens.css` — design tokens (single source). Screens and
  components reference tokens only, never raw values.
- `src/styles/components/` — the 6 shared primitives (button, input, modal,
  empty state, loading, toast).
- `src/app/screens/welcome/` — welcome-intro-only parts (glass 3D object,
  static fallback SVG, background illustration). Styles live in
  `src/app/styles/welcome.css`.
- `src/app/` — layout shell (`shell/`), flow screens (`screens/`), router
  (`router.tsx`), flow definition (`flow.ts`), invite session store (`session/`
  — per-token localStorage persistence + mock problem assignment), UI strings
  (`i18n/`).

Design principles and tone are governed by the root `DESIGN.md`; semantic
values and structure treat the Design Spec as the source of truth.
