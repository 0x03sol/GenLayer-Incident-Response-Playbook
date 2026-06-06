import React from "react";

interface CodeBlockProps {
  code: string;
  filename: string;
  variant: "vulnerable" | "patched";
  /** 1-based line numbers (matching the gutter) to mark as the
   *  vulnerability (vulnerable variant) or the fix (patched variant). */
  highlights?: number[];
}

export default function CodeBlock({
  code,
  filename,
  variant,
  highlights = [],
}: CodeBlockProps) {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  // Trim trailing empty lines so the panel doesn't have a giant tail.
  while (lines.length > 1 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const highlightSet = new Set(highlights);
  // hl == vulnerable (red), hl-ok == fix (green). These classes already
  // exist in playbook.css.
  const highlightClass = variant === "vulnerable" ? "hl" : "hl-ok";

  const label = variant === "vulnerable" ? "vulnerable" : "patched";
  const pillClass = variant === "vulnerable" ? "pill failed" : "pill success";
  const pillText = variant === "vulnerable" ? "Failed TX" : "Success TX";
  const consensusText =
    variant === "vulnerable"
      ? "> consensus failed · validators diverged"
      : "> consensus reached · all validators agree";
  const highlightNote =
    variant === "vulnerable"
      ? "Highlighted lines = the vulnerability"
      : "Highlighted lines = the fix";

  return (
    <div className="code-panel" data-variant={variant}>
      <div className="head">
        <div className="file">
          <span className="label">{label} ▸</span>
          {filename}
        </div>
        <span className={pillClass}>{pillText}</span>
      </div>
      <div className="hl-note">
        <span className="hl-note-swatch" aria-hidden="true" />
        {highlightNote}
      </div>
      <div
        className={`consensus-row ${variant === "vulnerable" ? "bad" : "ok"}`}
        data-consensus-text={consensusText}
      >
        <span className="consensus-text">{consensusText}</span>
      </div>
      <div className="body">
        <pre>
          {lines.map((line, i) => {
            const isHl = highlightSet.has(i + 1);
            const lnCls = `ln${isHl ? " " + highlightClass : ""}`;
            const lineCls = `line${isHl ? " " + highlightClass : ""}`;
            const title = isHl
              ? variant === "vulnerable"
                ? "Vulnerable line"
                : "The fix"
              : undefined;
            return (
              <React.Fragment key={i}>
                <span className={lnCls} data-line-index={i + 1} title={title}>
                  {i + 1}
                </span>
                <span className={lineCls} data-line-index={i + 1} title={title}>
                  {line === "" ? "\u200B" : line}
                </span>
              </React.Fragment>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
