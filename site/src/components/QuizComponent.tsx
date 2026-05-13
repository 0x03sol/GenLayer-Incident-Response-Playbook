"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { QuizQuestion } from "@/data/modules";
import { CommitEcho } from "./CommitEcho";

interface QuizComponentProps {
  questions: QuizQuestion[];
  /** Optional title shown above the question header, e.g. "Knowledge check · M.01". */
  title?: string;
  /** Optional intro paragraph under the title. */
  intro?: string;
  /** Optional per-question prefix (combined quiz uses this to prepend "M.01 · "). */
  prefixes?: string[];
  /** Optional storage key to remember the result locally. */
  storageKey?: string;
  /** Optional callback when the quiz finishes. */
  onComplete?: (passed: boolean) => void;
}

export default function QuizComponent({
  questions,
  title,
  intro,
  prefixes,
  storageKey,
  onComplete,
}: QuizComponentProps) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    new Array(total).fill(-1)
  );
  const [locked, setLocked] = useState<boolean[]>(() =>
    new Array(total).fill(false)
  );
  // Epoch ms per question, set on commit. Used to render the timestamp
  // in the CommitEcho and to key the echo so it animates exactly once.
  const [commitTimes, setCommitTimes] = useState<number[]>(() =>
    new Array(total).fill(0)
  );
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const correctCount = useMemo(
    () => answers.reduce((n, a, i) => (a === questions[i].correctIndex ? n + 1 : n), 0),
    [answers, questions]
  );

  function pick(optIdx: number) {
    if (locked[index]) return;
    const nextAnswers = answers.slice();
    nextAnswers[index] = optIdx;
    const nextLocked = locked.slice();
    nextLocked[index] = true;
    const nextTimes = commitTimes.slice();
    nextTimes[index] = Date.now();
    setAnswers(nextAnswers);
    setLocked(nextLocked);
    setCommitTimes(nextTimes);
  }

  function goNext() {
    if (answers[index] === -1) return;
    if (index === total - 1) {
      setFinished(true);
      const passed = correctCount / total >= 0.8;
      if (storageKey) {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ passed, score: correctCount, total })
          );
        } catch {
          /* ignore */
        }
      }
      onComplete?.(passed);
    } else {
      setIndex(index + 1);
    }
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1);
  }

  function reset() {
    setIndex(0);
    setAnswers(new Array(total).fill(-1));
    setLocked(new Array(total).fill(false));
    setCommitTimes(new Array(total).fill(0));
    setFinished(false);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  }

  const progress = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  const pct = correctCount / total;
  const verdictClass = pct >= 0.8 ? "pass" : pct >= 0.5 ? "" : "fail";
  const verdictText =
    pct >= 0.8
      ? "Passed — Operator certified"
      : pct >= 0.5
      ? "Partial — Review modules"
      : "Failed — Re-read playbook";

  return (
    <section className="quiz">
      <div className="header">
        {title ? <h3 className="h-section">{title}</h3> : <span aria-hidden="true" />}
        <div className="progress mono">{progress}</div>
      </div>
      {intro ? (
        <p
          className="text-mute"
          style={{ margin: "-12px 0 28px", fontSize: 14 }}
        >
          {intro}
        </p>
      ) : null}

      {!finished &&
        questions.map((q, qi) => {
          const isActive = qi === index;
          const isLocked = locked[qi];
          const picked = answers[qi];
          const correctIdx = q.correctIndex;
          const wasCorrect = picked === correctIdx;
          return (
            <div
              key={qi}
              className={`quiz-q${isActive ? " active" : ""}`}
              style={{ display: isActive ? "block" : "none" }}
            >
              <div className="q-num">
                Question {String(qi + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </div>
              <div className="q-text">
                {prefixes?.[qi] ? `${prefixes[qi]} — ` : ""}
                {q.question}
              </div>
              <div className="options">
                {q.options.map((opt, oi) => {
                  const cls = [
                    "quiz-option",
                    isLocked && oi === correctIdx ? "correct" : "",
                    isLocked && oi === picked && oi !== correctIdx ? "incorrect" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={oi}
                      type="button"
                      className={cls}
                      disabled={isLocked}
                      aria-selected={picked === oi}
                      onClick={() => pick(oi)}
                    >
                      <span className="marker">{String.fromCharCode(65 + oi)}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {isLocked && (
                <>
                  <CommitEcho
                    wasCorrect={wasCorrect}
                    committedAt={commitTimes[qi] || Date.now()}
                  />
                  <div
                    className={`quiz-feedback shown ${wasCorrect ? "ok" : "bad"}`}
                  >
                    <span className="label">
                      {wasCorrect ? "Correct" : "Incorrect"}
                    </span>
                    <span className="text">{q.explanation}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}

      {finished && (
        <div className="quiz-summary shown">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Result
          </div>
          <div className="score">
            <span className="score-num">
              <FinishedScore target={correctCount} />
            </span>
            <span className="denom"> / {total}</span>
          </div>
          <div className="verdict-sep" aria-hidden="true" />
          <div className={`verdict ${verdictClass}`}>
            <VerdictTypewriter text={verdictText} />
          </div>
          <div className="answers">
            {questions.map((q, qi) => {
              const ok = answers[qi] === q.correctIndex;
              return (
                <div key={qi} className="answer-row">
                  <div className="idx">{String(qi + 1).padStart(2, "0")}</div>
                  <div className="qref">
                    {prefixes?.[qi] ? `${prefixes[qi]} — ` : ""}
                    {q.question}
                  </div>
                  <div className={`status ${ok ? "ok" : "no"}`}>
                    {ok ? "correct" : "wrong"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="quiz-nav" data-finished={finished ? "1" : undefined}>
        <button
          type="button"
          className="btn ghost"
          onClick={goPrev}
          disabled={index === 0 || finished}
        >
          ← Previous
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn ghost" onClick={reset}>
            Reset
          </button>
          {!finished && (
            <button
              type="button"
              className="btn primary"
              onClick={goNext}
              disabled={answers[index] === -1}
            >
              {index === total - 1 ? "Finish →" : "Next →"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- finish-state delight helpers ---------- */

/** Counts up from 0 to `target` over ~700ms with an ease-out curve.
 *  Mounted only when the quiz finishes, so it animates exactly once
 *  per quiz run. Reduced-motion: jumps straight to `target`. */
function FinishedScore({ target }: { target: number }) {
  const [value, setValue] = useState<number>(() => 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return <>{value}</>;
}

/** Types out `text` one character at a time with a blinking caret tail.
 *  Reduced-motion: emits the full string immediately, no caret. */
function VerdictTypewriter({ text }: { text: string }) {
  const [shown, setShown] = useState<string>("");
  const [showCaret, setShowCaret] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(text);
      setShowCaret(false);
      return;
    }
    setShown("");
    setShowCaret(true);
    // Start ~250ms after mount so the score-roll lands first; reads as
    // a sequence: separator -> score -> verdict.
    const timers: { start?: number; step?: number; settle?: number } = {};
    timers.start = window.setTimeout(() => {
      const STEP_MS = 26;
      let i = 0;
      timers.step = window.setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          if (timers.step !== undefined) window.clearInterval(timers.step);
          // Linger the caret briefly, then drop it.
          timers.settle = window.setTimeout(() => setShowCaret(false), 900);
        }
      }, STEP_MS);
    }, 250);

    return () => {
      if (timers.start !== undefined) window.clearTimeout(timers.start);
      if (timers.step !== undefined) window.clearInterval(timers.step);
      if (timers.settle !== undefined) window.clearTimeout(timers.settle);
    };
  }, [text]);

  return (
    <>
      <span>{shown}</span>
      {showCaret ? <span className="verdict-caret" aria-hidden="true">▍</span> : null}
    </>
  );
}
