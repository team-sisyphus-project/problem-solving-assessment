/*
 * 로케일 사전 — 한국어(ko) · defaultLocale
 * ---------------------------------------------------------------------------
 * Spec: foundations/i18n-strings.md
 *
 * 사용자 대면 문자열을 화면별 네임스페이스로 모은 정본(canonical) 키 세트다.
 * 네임스페이스 경계(app / nav / screens.<screen> / providers / fallback)와
 * 키 이름은 시맨틱 역할을 나타내며, 표시될 실제 문장을 이름에 넣지 않는다.
 *
 * 새 로케일을 추가할 때는 이 파일과 **동일한 키 집합**을 가진 병렬 파일을
 * `i18n/locales/<locale>.ts`로 만들어 번역만 채운다(키 신설/삭제는 ko에서 먼저).
 *
 * 톤은 foundations/design-principles.md / 레포 루트 DESIGN.md의 "신뢰감 있고
 * 정돈된" B2B 채용 톤을 재사용한다 — 차분하고 명확하게.
 * ---------------------------------------------------------------------------
 */

export const ko = {
  /** 제품/셸 공통 */
  app: {
    productName: "문제해결력 평가",
    /** 헤더에 붙는 현재 맥락(응시 흐름) 라벨 */
    context: "지원자 응시",
  },

  /** 단계 표시자(navigation) 접근성 라벨 */
  nav: {
    ariaLabel: "응시 흐름 단계",
    /** 단계 상태 표기(색 단독 금지 — 텍스트 병행, design-principles 원칙 2) */
    statusDone: "완료",
    statusCurrent: "현재 단계",
    statusUpcoming: "예정",
  },

  /** 흐름 각 단계의 화면 문구 */
  screens: {
    verify: {
      stepLabel: "본인 확인",
      title: "본인 확인 후 응시를 시작합니다",
      description:
        "별도 회원가입이나 로그인 없이, 이름과 이메일 등 최소 정보로 본인을 확인하면 바로 응시가 시작됩니다. 입력 폼은 다음 단계에서 배선됩니다.",
      primaryAction: "본인 확인하고 시작하기",
    },
    brief: {
      stepLabel: "문제 안내",
      title: "배정된 문제를 확인하세요",
      description:
        "본인에게 무작위로 배정된 문제 1건이 여기에 안내됩니다. 문제 상세 표시는 다음 단계에서 배선됩니다. 준비가 되면 풀이를 시작하세요.",
      primaryAction: "풀이 시작",
      backAction: "이전",
    },
    solve: {
      stepLabel: "문제 풀이",
      title: "문제 풀이",
      description:
        "아래 대화형 AI와 함께 문제를 풀어 나가세요. 주고받은 대화 로그가 담당자의 평가 자료가 됩니다.",
      primaryAction: "제출",
      backAction: "이전",
      /** 제공자 선택 슬롯(M-5) — 참조 화면 안에서 응답 AI를 고르는 자리.
       * 실제 키 연동 로직은 범위 밖(BYOP 연결 자리는 placeholder). */
      providerLegend: "응답 AI 선택",
      providerHint:
        "GPT · Claude · Gemini 중 하나로 응시합니다. 선택하면 아래 대화가 그 AI로 응답합니다.",
      providerSelectedPrefix: "선택됨:",
      providerNoneSelected: "아직 선택하지 않았습니다.",
      /** 연결 자리(BYOP placeholder) — 실제 키 로직 없음, 예약된 자리만 노출 */
      connectSlotTitle: "연결 자리 (BYOP)",
      connectSlotHintNone:
        "제공자를 선택하면 본인 AI 계정을 연결하는 자리가 여기에 준비됩니다. 실제 키 연동은 이후 단계에서 배선됩니다.",
      connectSlotHintSuffix:
        "계정 연결 자리입니다. 실제 키 연동은 이후 단계에서 배선됩니다.",
      /** 대화 시작 전 빈 상태(empty-state 재사용) */
      emptyTitle: "대화를 시작해 보세요",
      emptyDescription:
        "아래 입력창에 첫 메시지를 보내면 대화가 시작됩니다. 문제 해결 과정을 자유롭게 풀어 나가세요.",
      /** 말풍선 작성자 라벨 */
      authorApplicant: "나",
      authorAi: "AI",
      /** AI 응답 대기 표시(loading 재사용) 문구 */
      pendingText: "응답을 생성하고 있습니다…",
      /** composer — 입력·힌트·전송 */
      composerPlaceholder: "메시지를 입력하세요",
      composerHint:
        "전송하면 선택한 AI가 응답합니다. 실제 키 연동은 이후 단계에서 배선됩니다.",
      /** 제공자 미선택 시 전송 비활성 안내 */
      composerHintNoProvider: "먼저 위에서 응답 AI를 선택하세요.",
      sendAction: "전송",
      /** stub 응답 — 실제 LLM 연동 없이 흐름만 시연하는 임시 문구 */
      stubReply:
        "(예시 응답) 실제 AI 연동은 이후 단계에서 배선됩니다. 지금은 골격 시연을 위한 임시 응답으로, 문제 해결 흐름을 이어 갈 수 있습니다.",
    },
    complete: {
      stepLabel: "제출 완료",
      title: "제출이 완료되었습니다",
      description:
        "응시가 종료되었습니다. 결과는 담당자가 대화 로그를 검토해 평가합니다. 이 화면은 흐름의 종료 상태입니다.",
      restartAction: "처음으로",
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
    notice: "요청한 화면을 찾을 수 없어 처음 단계로 이동합니다.",
  },
} as const;
