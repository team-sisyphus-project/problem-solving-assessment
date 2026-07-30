/*
 * UI 문자열 — 단일 모듈 (Single Source of Strings)
 * ---------------------------------------------------------------------------
 * 사용자 대면 문자열을 이 파일에만 둔다. 화면·컴포넌트는 리터럴 문자열을
 * 직접 쓰지 않고 여기의 키만 참조해 문구 산개를 막는다.
 *
 * i18n 시스템(로케일 전환·번들 로딩)은 이번 골격 범위 밖이다. 다만 향후
 * i18n 도입 시 그대로 키 사전으로 승격될 수 있도록, 지금부터 문구를 한 곳에
 * 모아 둔다(현재 단일 언어: 한국어). 톤은 design-principles.md의 "신뢰감 있고
 * 정돈된" B2B 채용 톤을 따른다 — 차분하고 명확하게.
 * ---------------------------------------------------------------------------
 */

export const strings = {
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
    start: {
      stepLabel: "시작·안내",
      title: "응시를 시작합니다",
      description:
        "무작위로 출제되는 문제를 화면 안의 대화형 AI와 함께 풀어 제출합니다. 준비가 되면 아래에서 시작하세요.",
      primaryAction: "응시 시작",
    },
    connect: {
      stepLabel: "LLM 연결·선택",
      title: "사용할 AI를 선택하세요",
      description:
        "본인이 사용하는 AI 계정을 직접 연결해 응시합니다(BYOP). 플랫폼은 키를 대신 보유하지 않습니다. 연결 방식의 세부 UI는 다음 단계에서 배선됩니다.",
      /** 제공자 선택 자리(M-5) — 실제 키 연동 로직은 범위 밖 */
      providerLegend: "AI 제공자",
      providerHint: "하나를 선택하면 연결 자리로 이동합니다.",
      selectedPrefix: "선택됨:",
      noneSelected: "아직 선택하지 않았습니다.",
      primaryAction: "연결하고 계속",
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

export type Strings = typeof strings;
