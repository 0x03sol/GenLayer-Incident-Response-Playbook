import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import { CodeDiffOverlay } from "@/components/CodeDiffOverlay";
import QuizComponent from "@/components/QuizComponent";
import { modules, getModuleById, getAllModuleIds } from "@/data/modules";
import {
  shortAddress,
  moduleNumber,
  addressFromExplorerUrl,
} from "@/lib/fmt";

export function generateStaticParams() {
  return getAllModuleIds().map((id) => ({ id: String(id) }));
}

function readContractFile(filePath: string): string {
  try {
    const fullPath = path.join(process.cwd(), "public", filePath);
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return "# Contract file not found";
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModulePage({ params }: PageProps) {
  const { id } = await params;
  const moduleId = parseInt(id, 10);
  const mod = getModuleById(moduleId);
  if (!mod) {
    notFound();
  }

  const prev = modules.find((m) => m.id === moduleId - 1);
  const next = modules.find((m) => m.id === moduleId + 1);

  const vulnerableCode = readContractFile(mod.vulnerableFileName);
  const patchedCode = readContractFile(mod.patchedFileName);

  const vulnAddr = addressFromExplorerUrl(mod.deployToStudioUrl);
  const patchAddr = addressFromExplorerUrl(mod.verifyFixUrl);

  const mNum = moduleNumber(mod.id);

  return (
    <>
      <nav className="crumb" aria-label="breadcrumb">
        <Link href="/">Playbook</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <Link href="/#modules">Modules</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <span style={{ color: "var(--fg-dim)" }}>
          {mNum} · {mod.title}
        </span>
      </nav>

      <section className="detail-hero">
        <div>
          <div className="module-num">Module {mNum}</div>
          <h1 className="h-page">{mod.title}</h1>
          <div className="subtitle">{mod.subtitle}</div>
          <p className="lead">{mod.description}</p>
        </div>
        <aside className="sidecard" aria-label="incident metadata">
          <div className="row">
            <div className="k">Network</div>
            <div className="v">Bradbury · chain 4221</div>
          </div>
          <div className="row">
            <div className="k">Vulnerable contract</div>
            <div className="v">{shortAddress(vulnAddr)}</div>
          </div>
          <div className="row">
            <div className="k">Patched contract</div>
            <div className="v">{shortAddress(patchAddr)}</div>
          </div>
          <div className="row">
            <div className="k">Failed TX result</div>
            <a
              className="v dim"
              href={mod.failedTxExplorer}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${mod.failedExecResult} transaction on Bradbury Explorer`}
            >
              {mod.failedExecResult} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="row">
            <div className="k">Patched TX result</div>
            <a
              className="v dim"
              href={mod.successTxExplorer}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${mod.successExecResult} transaction on Bradbury Explorer`}
            >
              {mod.successExecResult} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </aside>
      </section>

      <section style={{ marginBottom: 64 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 20,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <h2 className="h-section" style={{ margin: 0 }}>
            Side-by-side · Vulnerable vs. Patched
          </h2>
          <div
            className="mono"
            style={{
              fontSize: 11.5,
              color: "var(--fg-faint)",
              letterSpacing: "0.05em",
            }}
          >
            two contracts · proven by paired transactions
          </div>
        </div>
        <div className="code-pair">
          <CodeBlock
            code={vulnerableCode}
            filename={mod.vulnerableFileName}
            variant="vulnerable"
          />
          <CodeBlock
            code={patchedCode}
            filename={mod.patchedFileName}
            variant="patched"
          />
        </div>
        <CodeDiffOverlay />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 24,
          }}
        >
          <div
            style={{
              borderLeft: "2px solid var(--red)",
              padding: "6px 0 6px 18px",
            }}
          >
            <div
              className="eyebrow"
              style={{ color: "var(--red)", marginBottom: 8 }}
            >
              Call invoked
            </div>
            <code
              style={{
                fontSize: 12.5,
                color: "var(--fg-dim)",
                display: "block",
                marginBottom: 10,
                wordBreak: "break-all",
              }}
            >
              {mod.failedCallMethod}
            </code>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--fg-mute)",
                margin: 0,
              }}
            >
              {mod.failedNarrative}
            </p>
          </div>
          <div
            style={{
              borderLeft: "2px solid var(--green)",
              padding: "6px 0 6px 18px",
            }}
          >
            <div
              className="eyebrow"
              style={{ color: "var(--green)", marginBottom: 8 }}
            >
              Call invoked
            </div>
            <code
              style={{
                fontSize: 12.5,
                color: "var(--fg-dim)",
                display: "block",
                marginBottom: 10,
                wordBreak: "break-all",
              }}
            >
              {mod.successCallMethod}
            </code>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--fg-mute)",
                margin: 0,
              }}
            >
              {mod.successNarrative}
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 80 }}>
        <h2 className="h-section">On-chain receipts</h2>
        <div className="tx-row">
          <a
            className="tx-card"
            href={mod.failedTxExplorer}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="head">
              <span className="label">Failed TX</span>
              <span className="pill failed">{mod.failedExecResult}</span>
            </div>
            <div className="hash">{mod.failedTxHash}</div>
            <div className="footer-row">
              <span className="ext">
                View on Bradbury Explorer <span aria-hidden="true">↗</span>
              </span>
              <span className="res">addr {shortAddress(vulnAddr)}</span>
            </div>
          </a>
          <a
            className="tx-card"
            href={mod.successTxExplorer}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="head">
              <span className="label">Success TX</span>
              <span className="pill success">{mod.successExecResult}</span>
            </div>
            <div className="hash">{mod.successTxHash}</div>
            <div className="footer-row">
              <span className="ext">
                View on Bradbury Explorer <span aria-hidden="true">↗</span>
              </span>
              <span className="res">addr {shortAddress(patchAddr)}</span>
            </div>
          </a>
        </div>
      </section>

      <QuizComponent
        title={`Knowledge check · ${mNum}`}
        intro="Two questions on this incident. Pick the best answer; the question locks once committed."
        questions={mod.quiz}
        storageKey={`module-${mod.id}-quiz`}
      />

      <nav className="module-nav" aria-label="module navigation">
        {prev ? (
          <Link href={`/module/${prev.id}`}>
            <div className="dir">← Previous · {moduleNumber(prev.id)}</div>
            <div className="title">{prev.title}</div>
          </Link>
        ) : (
          <span className="disabled" aria-disabled="true" style={{ display: "block", border: "1px solid var(--hair)", padding: "20px 22px", opacity: 0.4 }}>
            <div className="dir">← Previous</div>
            <div className="title text-faint">—</div>
          </span>
        )}
        {next ? (
          <Link href={`/module/${next.id}`} className="next">
            <div className="dir">Next · {moduleNumber(next.id)} →</div>
            <div className="title">{next.title}</div>
          </Link>
        ) : (
          <span className="disabled next" aria-disabled="true" style={{ display: "block", border: "1px solid var(--hair)", padding: "20px 22px", opacity: 0.4, textAlign: "right" }}>
            <div className="dir">Next →</div>
            <div className="title text-faint">—</div>
          </span>
        )}
      </nav>
    </>
  );
}
