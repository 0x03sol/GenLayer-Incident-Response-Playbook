import Link from "next/link";
import { modules } from "@/data/modules";
import { onchainMeta } from "@/data/onchain_meta";
import { moduleNumber, formatTimestampUTC } from "@/lib/fmt";
import { ModuleReveal } from "@/components/ModuleReveal";

export default function HomePage() {
  return (
    <>
      <section
        style={{
          paddingTop: 24,
          paddingBottom: 64,
          borderBottom: "1px solid var(--hair)",
          marginBottom: 48,
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 24 }}>
          Living security advisory · v2026.05.13
        </div>
        <h1 className="h-display" style={{ maxWidth: "18ch" }}>
          Eight failure modes of Intelligent Contracts, proven on-chain.
        </h1>
        <p className="lead" style={{ marginTop: 28 }}>
          A field reference for engineers writing GenLayer Intelligent
          Contracts. Each module pairs a vulnerable contract with its patched
          twin and links the real Bradbury testnet transactions that demonstrate
          the bug failing and the fix succeeding. No theoretical exploits —
          every claim resolves to a finalized receipt.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 32,
            flexWrap: "wrap",
          }}
        >
          <a className="btn primary" href="#modules">
            Browse incidents →
          </a>
          <Link className="btn ghost" href="/quiz">
            Take combined quiz
          </Link>
        </div>
      </section>

      <section id="network" style={{ marginBottom: 80 }}>
        <div className="meta-strip">
          <div className="cell">
            <div className="label">Network</div>
            <div className="value">Bradbury testnet</div>
          </div>
          <div className="cell">
            <div className="label">Chain ID</div>
            <div className="value">4221</div>
          </div>
          <div className="cell">
            <div className="label">Contracts deployed</div>
            <div className="value">16 · all ACCEPTED</div>
          </div>
          <div className="cell">
            <div className="label">RPC endpoint</div>
            <div className="value">rpc-bradbury.genlayer.com</div>
          </div>
        </div>
      </section>

      <section
        id="modules"
        aria-labelledby="modules-heading"
        style={{ marginBottom: 80 }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 28,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <h2 id="modules-heading" className="h-section" style={{ margin: 0 }}>
            Incidents · 01 – 08
          </h2>
          <div
            className="mono"
            style={{
              color: "var(--fg-faint)",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
            }}
          >
            {modules.length} modules · {modules.reduce((n, m) => n + m.quiz.length, 0)}{" "}
            questions
          </div>
        </header>
        <div className="module-grid">
          {modules.map((m) => {
            const failedMeta = onchainMeta[m.failedTxHash];
            const successMeta = onchainMeta[m.successTxHash];
            return (
              <Link
                key={m.id}
                href={`/module/${m.id}`}
                className="module-row"
                aria-label={`${moduleNumber(m.id)} ${m.title} \u2014 read incident`}
              >
                <header className="row-head">
                  <div className="num" data-decode>
                    {moduleNumber(m.id)}
                  </div>
                  <div className="title-block">
                    <h3 data-decode>{m.title}</h3>
                    <div className="sub" data-decode>
                      {m.subtitle}
                    </div>
                  </div>
                </header>
                <div className="incident-grid">
                  <div className="col attack-col">
                    <div className="col-head">
                      <span className="col-label">ATTACK</span>
                      <span className="pill failed" aria-hidden="true">
                        Failed TX
                      </span>
                    </div>
                    <p className="col-body" data-decode>
                      {m.attack}
                    </p>
                    {failedMeta && (
                      <div className="col-meta" aria-hidden="true">
                        <div className="meta-line">
                          <span>{failedMeta.statusName}</span>
                          <span className="sep">·</span>
                          <span>{failedMeta.resultName}</span>
                          <span className="sep">·</span>
                          <span>{failedMeta.leaderShort}</span>
                          <span className="sep">·</span>
                          <span>{`${failedMeta.validators} validators`}</span>
                        </div>
                        <div className="meta-time">
                          {formatTimestampUTC(failedMeta.createdTimestamp)}
                        </div>
                      </div>
                    )}
                    <span className="col-cta">
                      Read incident{" "}
                      <span className="arrow" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </div>
                  <div className="col-divider" aria-hidden="true" />
                  <div className="col fix-col">
                    <div className="col-head">
                      <span className="col-label">FIX</span>
                      <span className="pill success" aria-hidden="true">
                        Success TX
                      </span>
                    </div>
                    <p className="col-body" data-decode>
                      {m.fix}
                    </p>
                    {successMeta && (
                      <div className="col-meta" aria-hidden="true">
                        <div className="meta-line">
                          <span>{successMeta.statusName}</span>
                          <span className="sep">·</span>
                          <span>{successMeta.resultName}</span>
                          <span className="sep">·</span>
                          <span>{successMeta.leaderShort}</span>
                          <span className="sep">·</span>
                          <span>{`${successMeta.validators} validators`}</span>
                        </div>
                        <div className="meta-time">
                          {formatTimestampUTC(successMeta.createdTimestamp)}
                        </div>
                      </div>
                    )}
                    <span className="col-cta">
                      Read incident{" "}
                      <span className="arrow" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <ModuleReveal />
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 className="h-section">How to read this playbook</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
            marginTop: 20,
          }}
        >
          {[
            {
              k: "01 · Read",
              h: "Open an incident",
              p: "Each module page describes the failure mode in plain language and shows the vulnerable code beside the patched code.",
            },
            {
              k: "02 · Verify",
              h: "Follow the receipts",
              p: "Two transaction-link buttons take you to Bradbury Explorer — the failing call and the succeeding call, each with execution result inline.",
            },
            {
              k: "03 · Check",
              h: "Answer the quiz",
              p: "Two questions per incident lock once committed. The combined quiz aggregates all 16 for a final score.",
            },
          ].map((step) => (
            <div
              key={step.k}
              style={{
                border: "1px solid var(--hair)",
                padding: "22px 24px",
                background: "var(--surface)",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--accent)",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                {step.k}
              </div>
              <h3
                style={{
                  fontSize: 17,
                  letterSpacing: "-0.015em",
                  margin: "0 0 8px",
                  fontWeight: 500,
                }}
              >
                {step.h}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--fg-mute)",
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                {step.p}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
