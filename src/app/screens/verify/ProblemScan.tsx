/*
 * ProblemScan — 본인 확인 화면 좌측의 "문제를 훑어 내려가는" 연출
 * ---------------------------------------------------------------------------
 * 참고 영상의 스캔 모션을 옮긴 것이다. 원근으로 기울어진 글줄 위를 하이라이트가
 * 한 단어씩 지나가고, 초점이 놓인 띠만 또렷하며 나머지는 흐려진다.
 *
 * 구현의 핵심은 **같은 글을 두 겹으로 겹치는** 것이다.
 *   - 흐린 겹(blur)  : 전체를 흐리게 깔아 두는 바닥.
 *   - 또렷한 겹(sharp): 화면 좌표 기준으로 **고정된** 가로 띠 모양 마스크를 씌운다.
 * 두 겹이 같은 만큼 위로 밀려 올라가므로, 또렷한 띠는 늘 같은 자리에 머무르고
 * 글이 그 아래로 흘러간다. 마스크가 아니라 글이 움직이기 때문에 띠와 글의
 * 움직임이 어긋나지 않는다.
 *
 * 이 문단은 장식이 아니라 읽히는 콘텐츠다 — 스크린리더에는 평범한 문단으로
 * 그대로 읽히고, 단어를 감싼 span은 시각 연출에만 쓰인다.
 *
 * `prefers-reduced-motion`에서는 하이라이트가 움직이지 않고, 글도 기울지 않은
 * 채 처음 위치에서 멈춘다(같은 문장을 그대로 읽을 수 있다).
 *
 * 색·간격은 토큰만 참조한다. 회전 각도·마스크 위치·주기처럼 "값을 바꿔도
 * 사용자가 색·간격으로 인지하지 못하는" 값은 구현 설정값이라 리터럴이다.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { strings } from "../../i18n";

/** 하이라이트가 한 단어에 머무는 시간(ms) — 읽는 속도에 가깝게 */
const WORD_INTERVAL = 240;

/** 또렷한 띠가 놓이는 세로 위치(패널 높이 대비) */
const FOCUS_ANCHOR = 0.3;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function ProblemScan() {
  const s = strings.screens.verify;
  const words = s.scanBody.split(" ");

  const panelRef = useRef<HTMLDivElement>(null);
  const sharpRef = useRef<HTMLParagraphElement>(null);

  const [active, setActive] = useState(0);
  const [shift, setShift] = useState(0);
  const reduced = usePrefersReducedMotion();

  // 하이라이트를 한 단어씩 앞으로. 끝에 닿으면 처음으로 돌아가 반복한다.
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % words.length);
    }, WORD_INTERVAL);
    return () => window.clearInterval(timer);
  }, [reduced, words.length]);

  /*
   * 활성 단어가 또렷한 띠에 오도록 글 전체를 위로 민다. 브라우저가 줄바꿈을
   * 어디서 했는지는 렌더 후에야 알 수 있으므로, 실제 span의 위치를 재서 옮긴다
   * (줄 수를 미리 계산하지 않는다).
   */
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const activeEl = sharpRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    if (!panel || !activeEl) return;
    const anchor = panel.clientHeight * FOCUS_ANCHOR;
    setShift(anchor - (activeEl.offsetTop + activeEl.offsetHeight / 2));
  }, [active]);

  const stageStyle = { "--scan-shift": `${shift}px` } as React.CSSProperties;

  const renderWords = (sharp: boolean) =>
    words.map((word, i) => (
      <span
        key={`${i}-${word}`}
        className={
          i === active ? "scan__word scan__word--active" : "scan__word"
        }
        {...(sharp && i === active ? { "data-active": "true" } : {})}
      >
        {word}{" "}
      </span>
    ));

  return (
    <div className="scan" ref={panelRef}>
      <span className="scan__label">{s.scanLabel}</span>

      {/* 흐린 바닥 겹 — 같은 글을 통째로 흐리게 깐다(스크린리더에는 중복이므로 숨김) */}
      <div className="scan__layer scan__layer--blur" aria-hidden="true">
        <div className="scan__stage" style={stageStyle}>
          <p className="scan__text">{renderWords(false)}</p>
        </div>
      </div>

      {/* 또렷한 겹 — 화면에 고정된 가로 띠만 통과시킨다. 문단 원문은 이쪽에 있다 */}
      <div className="scan__layer scan__layer--sharp">
        <div className="scan__stage" style={stageStyle}>
          <p className="scan__text" ref={sharpRef}>
            {renderWords(true)}
          </p>
        </div>
      </div>
    </div>
  );
}
