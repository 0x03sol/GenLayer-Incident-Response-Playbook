"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** True if the user picked the correct answer for this question. */
  wasCorrect: boolean;
  /** Epoch ms at which the answer was committed. Used as the timestamp
   *  rendered in the echo line and as the React key for re-mount control. */
  committedAt: number;
}

/** "Terminal echo" line that types in below the options when an answer
 *  is committed. Echoes the playbook's on-chain voice ("evidence",
 *  "validators agree/disagree") and varies by correctness. The animation
 *  runs only on first mount; navigating back to an already-locked
 *  question shows the final state without re-typing. */
export function CommitEcho({ wasCorrect, committedAt }: Props) {
  const stamp = formatStamp(committedAt);
  const final = wasCorrect
    ? `> verified · evidence agrees · committed ${stamp}`
    : `> divergence · 0 of 1 validators agree · committed ${stamp}`;

  const [text, setText] = useState<string>(() => {
    // SSR / first-render: emit the full final string so screen readers
    // and reduced-motion users immediately get the message.
    return final;
  });
  const cursorOnRef = useRef<boolean>(true);
  const [cursorOn, setCursorOn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setText(final);
      setCursorOn(false);
      return;
    }

    // Type from empty up to final. ~14ms per char keeps it under 800ms
    // for typical line lengths and reads as a quick terminal echo.
    let i = 0;
    setText("");
    setCursorOn(true);

    const STEP_MS = 14;
    const interval = window.setInterval(() => {
      i += 1;
      setText(final.slice(0, i));
      if (i >= final.length) {
        window.clearInterval(interval);
        // Briefly keep the cursor blinking, then turn it off so the
        // echo settles into a static log line.
        window.setTimeout(() => {
          if (cursorOnRef.current) setCursorOn(false);
        }, 700);
      }
    }, STEP_MS);

    return () => {
      window.clearInterval(interval);
      cursorOnRef.current = false;
    };
    // committedAt is stable across renders (it's set once at pick-time)
    // so this effect intentionally runs only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`commit-echo ${wasCorrect ? "ok" : "bad"}`}
      role="status"
      aria-live="polite"
      data-committed-at={committedAt}
    >
      <span className="commit-echo-text">{text}</span>
      {cursorOn ? <span className="commit-echo-cursor" aria-hidden="true">▍</span> : null}
    </div>
  );
}

function formatStamp(ms: number): string {
  // HH:MM:SS UTC -- matches the playbook's on-chain timestamp format.
  try {
    const iso = new Date(ms).toISOString(); // 2026-05-13T22:08:17.000Z
    return `${iso.slice(11, 19)} UTC`;
  } catch {
    return "—";
  }
}
