import Link from "next/link";
import { modules } from "@/data/modules";
import { moduleNumber } from "@/lib/fmt";

export default function NotFound() {
  return (
    <div className="empty">
      <div className="code">EXECUTION_RESULT · FINISHED_WITH_ERROR</div>
      <h1 className="h-page" style={{ marginBottom: 16 }}>
        Page not found.
      </h1>
      <p
        className="lead text-mute"
        style={{ margin: "0 auto 32px", maxWidth: "48ch" }}
      >
        The route you followed does not resolve to an incident in this playbook.
        The equivalence principle is unanimous on this point.
      </p>
      <div
        style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
      >
        <Link className="btn primary" href="/">
          ← Return to index
        </Link>
        <Link className="btn ghost" href="/quiz">
          Take combined quiz
        </Link>
      </div>
      <div
        style={{
          marginTop: 48,
          borderTop: "1px solid var(--hair)",
          paddingTop: 28,
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          All incidents
        </div>
        <div
          style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}
        >
          {modules.map((m) => (
            <Link
              key={m.id}
              className="btn ghost"
              style={{ fontSize: 12, padding: "6px 12px" }}
              href={`/module/${m.id}`}
            >
              {moduleNumber(m.id)} · {m.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
