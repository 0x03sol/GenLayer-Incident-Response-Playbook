"use client";

import Link from "next/link";
import QuizComponent from "@/components/QuizComponent";
import { modules } from "@/data/modules";
import { moduleNumber } from "@/lib/fmt";

export default function QuizPage() {
  const combined = modules.flatMap((m) => m.quiz);
  const prefixes = modules.flatMap((m) =>
    m.quiz.map(() => `${moduleNumber(m.id)} · ${m.title}`)
  );
  const total = combined.length;
  const pass = Math.ceil(total * 0.8);

  return (
    <>
      <nav className="crumb" aria-label="breadcrumb">
        <Link href="/">Playbook</Link>
        <span className="sep">/</span>
        <span style={{ color: "var(--fg-dim)" }}>Combined quiz</span>
      </nav>

      <section
        style={{
          margin: "24px 0 48px",
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 64,
          alignItems: "end",
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Operator certification
          </div>
          <h1 className="h-page" style={{ maxWidth: "18ch" }}>
            Combined knowledge check.
          </h1>
          <p className="lead" style={{ marginTop: 18 }}>
            {total} questions, two from each module. Pass with 80% to clear the
            playbook. Each question locks on commit — your mistakes are recorded
            in the result panel so you can re-read the relevant incident.
          </p>
        </div>
        <aside
          className="sidecard"
          style={{ border: "1px solid var(--hair)", background: "var(--surface)" }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--hair)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
                marginBottom: 4,
              }}
            >
              Questions
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--fg)",
              }}
            >
              {total}
            </div>
          </div>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--hair)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
                marginBottom: 4,
              }}
            >
              Pass threshold
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--fg)",
              }}
            >
              {pass} / {total} · 80%
            </div>
          </div>
          <div style={{ padding: "14px 18px" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
                marginBottom: 4,
              }}
            >
              Modules covered
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--fg)",
              }}
            >
              {moduleNumber(modules[0].id)} – {moduleNumber(modules[modules.length - 1].id)}
            </div>
          </div>
        </aside>
      </section>

      <QuizComponent
        questions={combined}
        prefixes={prefixes}
        storageKey="combined-quiz"
      />

      <div
        style={{
          marginTop: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--fg-mute)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          ← Back to playbook index
        </Link>
        <div
          className="mono text-faint"
          style={{ fontSize: 12 }}
        >
          scoring is local · no data leaves your browser
        </div>
      </div>
    </>
  );
}
