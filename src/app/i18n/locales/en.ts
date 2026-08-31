/*
 * Locale dictionary — English (en) · defaultLocale
 * ---------------------------------------------------------------------------
 * Spec: foundations/i18n-strings.md
 *
 * This product's user-facing language is **English only** (Korean is not
 * supported). `en` is therefore the canonical key set and the only locale.
 * Code comments are internal team documentation, but every string that ships
 * to the screen exists only in this file.
 *
 * The namespace boundaries (app / nav / screens.<screen> / providers /
 * fallback) and key names express semantic roles; the actual sentence to be
 * displayed is never put into a name.
 *
 * If a new locale is ever added, create a parallel file with the **exact same
 * key set** as this one at `i18n/locales/<locale>.ts` and fill in only the
 * translations (keys are added/removed in en first).
 *
 * The tone reuses the "trustworthy and composed" B2B hiring tone from the
 * repo-root DESIGN.md — calm, clear English, with no exaggeration.
 * ---------------------------------------------------------------------------
 */

export const en = {
  /** Product/shell common */
  app: {
    productName: "Problem Solving Assessment",
    /** Current-context (assessment flow) label attached to the header */
    context: "Candidate assessment",
    /** The brand mark is a link back to the beginning (welcome) — the link's accessible name */
    homeLabel: "Back to the start",
  },

  /** Step indicator (navigation) accessibility labels */
  nav: {
    ariaLabel: "Assessment steps",
    /** Step status wording (never color alone — text alongside, design-principles rule 2) */
    statusDone: "Completed",
    statusCurrent: "Current step",
    statusUpcoming: "Upcoming",
  },

  /** Screen copy for each step of the flow */
  screens: {
    /**
     * Welcome intro — the entry screen **ahead of** the 4-step flow (not a step).
     * The single welcome page a candidate arriving via the invite link sees
     * before facing the identity verification form. It does not appear in the
     * step indicator, so it has no `stepLabel` (the 4-step structure is
     * unchanged).
     */
    welcome: {
      /** eyebrow — small line at the top signalling this link is an invitation issued to this person alone */
      eyebrow: "— Your personal invitation —",
      /** Title — the screen's main focus (rule 3) */
      title: "Welcome",
      /** Subcopy — a light nudge toward the next action */
      description:
        "Not a test with right answers. A space to think out loud, and show how you work through a problem.",
      /** Single CTA — the only action on this screen (no skip, no back) */
      primaryAction: "Get Started",
      /** Accessible name for the central 3D object (decorative, but we leave alt text) */
      visualLabel: "Decorative brand object",
    },
    verify: {
      stepLabel: "Identity",
      title: "Confirm who you are to begin",
      description:
        "No account or password needed. Enter your name and email to confirm your identity, and the assessment starts right away.",
      /** Form field — name */
      nameLabel: "Full name",
      namePlaceholder: "e.g. Alex Morgan",
      /** Form field — email */
      emailLabel: "Email",
      emailPlaceholder: "e.g. alex@example.com",
      /** Helper text below the form — what the details are used for */
      formHint: "We use these details only to confirm your submission.",
      /**
       * Left panel — the body copy carried by the problem-scanning animation.
       * It is readable content, not decoration (screen readers read this
       * paragraph as-is). A word-by-word highlight sweeps across it, so the
       * sentences are kept short and rhythmic.
       */
      scanLabel: "While we get your problem ready",
      scanBody:
        "This is not a quiz with one right answer. You will work through a single real problem in a conversation with an AI, and what we read afterwards is the conversation itself — how you framed the problem, what you questioned, where you changed your mind, and what you decided to leave out. Take the time you need. There is no clock counting down.",
      primaryAction: "Confirm and start",
      /** Local validation error messages (never color alone — message alongside, rule 2) */
      errorNameRequired: "Please enter your name.",
      errorEmailRequired: "Please enter your email.",
      errorEmailInvalid: "Please enter a valid email address.",
      /*
       * Consent to data review (S-1) — an explicit consent gate placed before
       * moving to the next step. Two notices carry equal weight: (a) reviewers
       * read not only the final result but the inputs and outputs produced
       * during the solving process (the conversation log), and (b) this data
       * is never used for any other purpose, such as LLM training. The two
       * sentences are kept separate for persona B (data-sensitive). Final
       * legal/HR copy is out of scope — this is reference copy satisfying
       * requirements (a) and (b).
       */
      consentTitle: "Before you begin",
      consentReview:
        "During this assessment, the hiring team reviews not only your final result but the problem-solving process itself — the messages you exchange and the work you produce along the way.",
      consentNoTraining:
        "This data is used only to review your submission — never to train AI (LLM) models, and never for any other purpose.",
      consentCheckboxLabel:
        "I understand and agree to how my assessment data is reviewed.",
      /** Notice when trying to proceed without consent (persona C — say why they are blocked) */
      consentRequired: "Please agree to the notice above to continue.",
    },
    /**
     * Previous submission notice — for re-entering the flow via a link that
     * has already been submitted.
     *
     * We used to lock the flow here. Now, instead of blocking, we **offer a
     * choice** — open the previous submission and read it back, or leave it
     * as it is and start again with a new problem. Whichever they choose, we
     * say clearly that the previous submission is never erased.
     */
    previous: {
      title: "You have already submitted this assessment",
      description:
        "Your earlier submission is on record and is with the hiring team. You can read it back below, or leave it as it is and start again with a different problem.",
      /** Expand/collapse the previous submission */
      viewAction: "Read my submission",
      hideAction: "Hide my submission",
      /** Summary item labels */
      submittedAtLabel: "Submitted",
      problemLabel: "Problem",
      messagesLabel: "Messages exchanged",
      attemptLabel: "Attempt",
      /** When the submission was made with no conversation at all */
      emptyLog: "No messages were recorded in this submission.",
      /** Offer to start again */
      restartTitle: "Start again with a new problem?",
      restartBody:
        "Starting again does not erase anything. Your earlier submission stays on record, you will be given a different problem, and you begin from the top.",
      restartAction: "Start a new problem",
      keepAction: "Leave it as it is",
    },
    brief: {
      stepLabel: "Your problem",
      /** Eyebrow atop the assigned-problem card — signals this is the one problem assigned to this candidate */
      assignedLabel: "ASSIGNED PROBLEM",
      /** Guidance below the card — context for the next action (start solving). The problem
       * title/description themselves are domain data (session/problems), not managed here. */
      guide:
        "This is the one problem assigned to you. Read it through, and start whenever you are ready.",
      primaryAction: "Start solving",
      backAction: "Back",
    },
    solve: {
      stepLabel: "Solve",
      title: "Work through the problem",
      description:
        "Think it through with the AI below. The conversation you have here is what the hiring team reviews.",

      /*
       * Solving is split into two phases. In phase 1 the candidate connects
       * their own AI (skippable); in phase 2 they actually converse and solve
       * the problem. The 4-step flow (step indicator) is unchanged — this is
       * a sub-phase **inside** the solving screen.
       */
      phaseConnectLabel: "Step 1 of 2",
      phaseConnectTitle: "Bring your own AI",
      phaseConnectLead:
        "You will solve this problem in a conversation with an AI — not alone, and not from memory.",
      phaseConnectBody:
        "We are not marking the final answer. What gets reviewed is the conversation: how you break the problem down, what you push back on, and how you decide. So use the AI you already work with, and work the way you normally do.",
      phaseConnectPrivacy:
        "Connect it with your own API key. The key stays in this browser and is never sent to our servers, saved, or written into the conversation log.",
      phaseConnectAction: "Connect and continue",
      phaseSkipAction: "Skip for now",
      phaseSkipNote: "You can connect an AI later, but you cannot start the conversation until you do.",

      phaseChatLabel: "Step 2 of 2",

      /** Notice in phase 2 when no AI has been connected yet */
      notConnectedTitle: "No AI connected yet",
      notConnectedBody:
        "You skipped this earlier. Connect an AI to start the conversation.",
      notConnectedAction: "Connect an AI",

      /** Pinned assigned-problem panel — collapsible so the problem stays visible during the chat */
      problemPinLabel: "Your problem",
      problemPinShow: "Show problem",
      problemPinHide: "Hide problem",

      /** Elapsed time — not a time limit, but a display for pacing yourself */
      timerLabel: "Time on this problem",
      timerHint: "No time limit. This is just so you can pace yourself.",

      primaryAction: "Submit",
      backAction: "Back",
      /** Submission confirmation modal (modal reuse, SC-4/M-4·M-5) — "Submit" → confirm → final submit.
       * It is an irreversible commitment, so the body states the consequences (lock, no retake) clearly. */
      submitModal: {
        title: "Submitting cannot be undone",
        body:
          "Your full conversation and the time of submission will be saved, and the assessment will end. You will not be able to reopen this link afterwards. Submit now?",
        cancelAction: "Go back",
        confirmAction: "Submit final",
      },
      /** Provider selection slot (M-5) — where the responding AI is chosen inside the reference screen.
       * Actual key-connection logic is out of scope (the BYOP connection slot is a placeholder). */
      providerLegend: "Choose your AI",
      providerHint:
        "Pick GPT, Claude, or Gemini. The conversation below is answered by the one you choose.",
      providerSelectedPrefix: "Selected:",
      providerNoneSelected: "Nothing selected yet.",
      /** Connecting your own API key (BYOP) — the candidate enters the key for their chosen provider.
       * The key is used only in browser session memory and never touches servers, storage, or logs. */
      keyFieldTitle: "Connect your own API key (BYOP)",
      keyFieldLabel: "API key",
      keyFieldPlaceholder: "Paste the API key from your provider",
      /** No-persistence policy for secrets — stated in text, per the never-color-alone rule */
      keyStorageNote:
        "Your key stays in this browser session only. It is never sent to our servers, saved to storage, or written into the conversation log.",
      keyFieldHintNone:
        "Choose your AI above, and the field for connecting your own API key opens here.",
      /** Empty state before the conversation starts (empty-state reuse) */
      emptyTitle: "Start the conversation",
      emptyDescription:
        "Send your first message below to begin. Work through the problem however you think best.",
      /** Message bubble author labels */
      authorApplicant: "You",
      authorAi: "AI",
      /** AI response pending indicator (loading reuse) copy */
      pendingText: "Generating a response…",
      /** composer — input, hint, send */
      composerPlaceholder: "Type a message",
      composerHint: "Sending uses your own key with the AI you selected.",
      /** Disabled-send notice when no provider is selected */
      composerHintNoProvider: "Choose your AI above and enter an API key first.",
      /** Disabled-send notice when no key is entered */
      composerHintNoKey: "Enter your API key to send.",
      sendAction: "Send",
      /** Error toast copy for a failed LLM call (fallback when the provider gives no message) */
      errorGeneric:
        "Could not get a response. Check your key and connection, then try again.",
    },
    complete: {
      stepLabel: "Submitted",
      title: "Your assessment is submitted",
      description:
        "You are all done. The hiring team will review your conversation and get back to you. This is the end of the flow.",
      restartAction: "Back to start",
    },
  },

  /** Provider list (M-5) — display names only. No connection logic. */
  providers: {
    gpt: "GPT",
    claude: "Claude",
    gemini: "Gemini",
  },

  /** Unknown path (deep-link fallback) notice */
  fallback: {
    notice: "We could not find that screen, so we brought you back to the first step.",
  },
} as const;
