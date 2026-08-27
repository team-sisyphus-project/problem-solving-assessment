/*
 * SolveTimer — 문제 풀이 경과 시간
 * ---------------------------------------------------------------------------
 * 제한 시간이 아니라 **경과 시간**이다. 카운트다운은 지원자를 쫓는 장치가 되고,
 * 이 제품은 답이 아니라 과정을 보는 자리라 그 압박이 목적과 어긋난다. 그래서
 * 올라가는 시계만 두고, "제한 없음"을 문구로 함께 밝힌다.
 *
 * 기준점은 세션의 startedAt이라 새로고침해도 0으로 되돌아가지 않는다.
 * 1초마다 갱신하되, 스크린리더가 매초 낭독하지 않도록 aria-live는 쓰지 않고
 * 라벨과 값만 읽히게 둔다.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { strings } from "../../i18n";

interface SolveTimerProps {
  /** 풀이를 시작한 시각(ISO). 아직 없으면 0부터 센다 */
  startedAt: string | null;
}

/** 경과 초를 mm:ss(1시간 넘으면 h:mm:ss)로 */
function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${pad(minutes)}:${pad(rest)}`;
}

export function SolveTimer({ startedAt }: SolveTimerProps) {
  const s = strings.screens.solve;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const base = startedAt ? new Date(startedAt).getTime() : now;
  const elapsed = formatElapsed((now - base) / 1000);

  return (
    <div className="solve-timer">
      <span className="solve-timer__label">{s.timerLabel}</span>
      <span className="solve-timer__value">{elapsed}</span>
      <span className="solve-timer__hint">{s.timerHint}</span>
    </div>
  );
}
