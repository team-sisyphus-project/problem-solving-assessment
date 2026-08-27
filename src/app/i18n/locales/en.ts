/*
 * 로케일 사전 — 영어(en) · defaultLocale
 * ---------------------------------------------------------------------------
 * Spec: foundations/i18n-strings.md
 *
 * 이 제품의 사용자 대면 언어는 **영어 하나뿐이다**(한국어 미지원). 따라서 `en`이
 * 정본(canonical) 키 세트이자 유일한 로케일이다. 코드 주석은 팀 내부 문서라
 * 한국어를 유지하되, 화면에 나가는 문자열은 이 파일에만 존재한다.
 *
 * 네임스페이스 경계(app / nav / screens.<screen> / providers / fallback)와 키
 * 이름은 시맨틱 역할을 나타내며, 표시될 실제 문장을 이름에 넣지 않는다.
 *
 * 새 로케일을 추가하게 되면 이 파일과 **동일한 키 집합**을 가진 병렬 파일을
 * `i18n/locales/<locale>.ts`로 만들어 번역만 채운다(키 신설/삭제는 en에서 먼저).
 *
 * 톤은 레포 루트 DESIGN.md의 "신뢰감 있고 정돈된" B2B 채용 톤을 재사용한다 —
 * 차분하고 명확한 영어로, 과장 없이.
 * ---------------------------------------------------------------------------
 */

export const en = {
  /** 제품/셸 공통 */
  app: {
    productName: "Problem Solving Assessment",
    /** 헤더에 붙는 현재 맥락(응시 흐름) 라벨 */
    context: "Candidate assessment",
    /** 브랜드 마크는 처음(웰컴)으로 돌아가는 링크다 — 링크의 접근성 이름 */
    homeLabel: "Back to the start",
  },

  /** 단계 표시자(navigation) 접근성 라벨 */
  nav: {
    ariaLabel: "Assessment steps",
    /** 단계 상태 표기(색 단독 금지 — 텍스트 병행, design-principles 원칙 2) */
    statusDone: "Completed",
    statusCurrent: "Current step",
    statusUpcoming: "Upcoming",
  },

  /** 흐름 각 단계의 화면 문구 */
  screens: {
    /**
     * 웰컴 인트로 — 흐름 4단계 **앞단**의 진입 화면(단계 아님).
     * 초대 링크로 들어온 지원자가 본인 확인 폼을 마주치기 전에 만나는 환영 한 장.
     * 단계 표시자에 노출되지 않으므로 `stepLabel`이 없다(4단계 구조 불변).
     */
    welcome: {
      /** eyebrow — 이 링크가 본인에게만 발급된 초대임을 알리는 작은 상단 문구 */
      eyebrow: "— Your personal invitation —",
      /** 타이틀 — 화면의 주요 초점(원칙 3) */
      title: "Welcome",
      /** 서브카피 — 다음 행동으로 가볍게 이끄는 안내 */
      description:
        "Not a test with right answers. A space to think out loud, and show how you work through a problem.",
      /** 단일 CTA — 이 화면의 유일한 액션(건너뛰기·뒤로가기 없음) */
      primaryAction: "Get Started",
      /** 중앙 3D 오브젝트의 접근성 이름(장식이지만 대체 텍스트를 남긴다) */
      visualLabel: "Decorative brand object",
    },
    verify: {
      stepLabel: "Identity",
      title: "Confirm who you are to begin",
      description:
        "No account or password needed. Enter your name and email to confirm your identity, and the assessment starts right away.",
      /** 폼 필드 — 이름 */
      nameLabel: "Full name",
      namePlaceholder: "e.g. Alex Morgan",
      /** 폼 필드 — 이메일 */
      emailLabel: "Email",
      emailPlaceholder: "e.g. alex@example.com",
      /** 폼 하단 안내(helper) — 정보 사용 목적 */
      formHint: "We use these details only to confirm your submission.",
      /**
       * 좌측 패널 — 문제를 훑어 내려가는 스캔 연출에 실리는 본문.
       * 장식이 아니라 읽히는 콘텐츠다(스크린리더도 이 문단을 그대로 읽는다).
       * 한 단어씩 하이라이트가 지나가므로 문장은 짧고 리듬이 있게 쓴다.
       */
      scanLabel: "While we get your problem ready",
      scanBody:
        "This is not a quiz with one right answer. You will work through a single real problem in a conversation with an AI, and what we read afterwards is the conversation itself — how you framed the problem, what you questioned, where you changed your mind, and what you decided to leave out. Take the time you need. There is no clock counting down.",
      primaryAction: "Confirm and start",
      /** 로컬 검증 오류 메시지(색 단독 금지 — 메시지 병행, 원칙 2) */
      errorNameRequired: "Please enter your name.",
      errorEmailRequired: "Please enter your email.",
      errorEmailInvalid: "Please enter a valid email address.",
    },
    /**
     * 지난 제출 안내 — 이미 제출한 링크로 흐름에 다시 들어왔을 때.
     *
     * 예전에는 여기서 흐름을 잠갔다. 지금은 막지 않고 **선택지를 준다** —
     * 지난 제출을 열어 보거나, 그대로 두고 새 문제로 다시 시작하거나.
     * 어느 쪽을 고르든 지난 제출은 지워지지 않는다는 점을 분명히 말한다.
     */
    previous: {
      title: "You have already submitted this assessment",
      description:
        "Your earlier submission is on record and is with the hiring team. You can read it back below, or leave it as it is and start again with a different problem.",
      /** 지난 제출 펼치기/접기 */
      viewAction: "Read my submission",
      hideAction: "Hide my submission",
      /** 요약 항목 라벨 */
      submittedAtLabel: "Submitted",
      problemLabel: "Problem",
      messagesLabel: "Messages exchanged",
      attemptLabel: "Attempt",
      /** 대화가 한 건도 없이 제출된 경우 */
      emptyLog: "No messages were recorded in this submission.",
      /** 다시 시작 제안 */
      restartTitle: "Start again with a new problem?",
      restartBody:
        "Starting again does not erase anything. Your earlier submission stays on record, you will be given a different problem, and you begin from the top.",
      restartAction: "Start a new problem",
      keepAction: "Leave it as it is",
    },
    brief: {
      stepLabel: "Your problem",
      /** 배정 문제 카드 상단 eyebrow — 이 문제가 본인에게 배정된 1건임을 알림 */
      assignedLabel: "ASSIGNED PROBLEM",
      /** 카드 하단 안내 — 다음 행동(풀이 시작)의 맥락. 문제 제목·설명 자체는
       * 도메인 데이터(session/problems)라 여기서 관리하지 않는다. */
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
       * 풀이는 두 단계로 나뉜다. 1단계에서 본인 AI를 연결하고(건너뛰기 가능),
       * 2단계에서 실제로 대화하며 문제를 푼다. 흐름 4단계(단계 표시자)는 그대로고,
       * 이건 풀이 화면 **안**의 하위 단계다.
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

      /** 2단계에서 AI가 아직 연결되지 않은 경우의 안내 */
      notConnectedTitle: "No AI connected yet",
      notConnectedBody:
        "You skipped this earlier. Connect an AI to start the conversation.",
      notConnectedAction: "Connect an AI",

      /** 배정 문제 고정 패널 — 채팅 중에도 문제를 계속 볼 수 있게 접었다 폈다 */
      problemPinLabel: "Your problem",
      problemPinShow: "Show problem",
      problemPinHide: "Hide problem",

      /** 경과 시간 — 제한 시간이 아니라 스스로 속도를 가늠하기 위한 표시 */
      timerLabel: "Time on this problem",
      timerHint: "No time limit. This is just so you can pace yourself.",

      primaryAction: "Submit",
      backAction: "Back",
      /** 제출 확인 모달(modal 재사용, SC-4/M-4·M-5) — "제출하기" → 확인 → 최종 제출.
       * 되돌릴 수 없는 확정이므로 결과(잠금·재응시 불가)를 본문에서 분명히 안내한다. */
      submitModal: {
        title: "Submitting cannot be undone",
        body:
          "Your full conversation and the time of submission will be saved, and the assessment will end. You will not be able to reopen this link afterwards. Submit now?",
        cancelAction: "Go back",
        confirmAction: "Submit final",
      },
      /** 제공자 선택 슬롯(M-5) — 참조 화면 안에서 응답 AI를 고르는 자리.
       * 실제 키 연동 로직은 범위 밖(BYOP 연결 자리는 placeholder). */
      providerLegend: "Choose your AI",
      providerHint:
        "Pick GPT, Claude, or Gemini. The conversation below is answered by the one you choose.",
      providerSelectedPrefix: "Selected:",
      providerNoneSelected: "Nothing selected yet.",
      /** 본인 API 키 연결(BYOP) — 지원자가 선택한 제공자의 키를 직접 입력한다.
       * 키는 브라우저 세션 메모리에서만 쓰이고 서버·저장소·로그에 남지 않는다. */
      keyFieldTitle: "Connect your own API key (BYOP)",
      keyFieldLabel: "API key",
      keyFieldPlaceholder: "Paste the API key from your provider",
      /** 비밀값 비저장 정책 — 색 단독 금지 원칙에 따라 텍스트로 명시 */
      keyStorageNote:
        "Your key stays in this browser session only. It is never sent to our servers, saved to storage, or written into the conversation log.",
      keyFieldHintNone:
        "Choose your AI above, and the field for connecting your own API key opens here.",
      /** 대화 시작 전 빈 상태(empty-state 재사용) */
      emptyTitle: "Start the conversation",
      emptyDescription:
        "Send your first message below to begin. Work through the problem however you think best.",
      /** 말풍선 작성자 라벨 */
      authorApplicant: "You",
      authorAi: "AI",
      /** AI 응답 대기 표시(loading 재사용) 문구 */
      pendingText: "Generating a response…",
      /** composer — 입력·힌트·전송 */
      composerPlaceholder: "Type a message",
      composerHint: "Sending uses your own key with the AI you selected.",
      /** 제공자 미선택 시 전송 비활성 안내 */
      composerHintNoProvider: "Choose your AI above and enter an API key first.",
      /** 키 미입력 시 전송 비활성 안내 */
      composerHintNoKey: "Enter your API key to send.",
      sendAction: "Send",
      /** LLM 호출 실패 시 오류 토스트 문구(제공자 메시지가 없을 때의 폴백) */
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

  /** 제공자 목록(M-5) — 표시명만. 연동 로직 없음. */
  providers: {
    gpt: "GPT",
    claude: "Claude",
    gemini: "Gemini",
  },

  /** 알 수 없는 경로(딥링크 fallback) 안내 */
  fallback: {
    notice: "We could not find that screen, so we brought you back to the first step.",
  },
} as const;
