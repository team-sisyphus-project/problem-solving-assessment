/*
 * ProblemPin — 대화 위에 고정되는 배정 문제
 * ---------------------------------------------------------------------------
 * 문제 안내(brief)를 지나 대화에 들어오면 문제 원문을 다시 볼 길이 없어진다.
 * 그래서 대화 바로 위에 문제를 붙여 두고, 접었다 폈다 할 수 있게 한다 — 항상
 * 펼쳐 두면 대화가 밀려나고, 아예 없으면 문제를 확인하러 화면을 떠나야 한다.
 *
 * 접힘 상태에서도 문제 **제목**은 남긴다. 무엇을 풀고 있는지는 접어도 보여야
 * 방향을 잃지 않는다. 상태는 버튼 문구와 aria-expanded로 함께 알린다
 * (색·아이콘 단독으로 전달하지 않는다).
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { strings } from "../../i18n";
import type { Problem } from "../../session/problems";

interface ProblemPinProps {
  problem: Problem;
}

export function ProblemPin({ problem }: ProblemPinProps) {
  const s = strings.screens.solve;
  const [open, setOpen] = useState(true);
  const bodyId = "problem-pin-body";

  return (
    <section className="problem-pin" aria-label={s.problemPinLabel}>
      <div className="problem-pin__head">
        <div className="problem-pin__heading">
          <span className="problem-pin__eyebrow">{s.problemPinLabel}</span>
          <h2 className="problem-pin__title">{problem.title}</h2>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? s.problemPinHide : s.problemPinShow}
        </button>
      </div>

      {open && (
        <p className="problem-pin__body" id={bodyId}>
          {problem.description}
        </p>
      )}
    </section>
  );
}
