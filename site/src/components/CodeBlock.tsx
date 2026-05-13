import React from "react";

interface CodeBlockProps {
  code: string;
  filename: string;
  variant: "vulnerable" | "patched";
}

export default function CodeBlock({ code, filename, variant }: CodeBlockProps) {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  // Trim trailing empty lines so the panel doesn't have a giant tail.
  while (lines.length > 1 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const label = variant === "vulnerable" ? "vulnerable" : "patched";
  const pillClass = variant === "vulnerable" ? "pill failed" : "pill success";
  const pillText = variant === "vulnerable" ? "Failed TX" : "Success TX";
  const consensusText =
    variant === "vulnerable"
      ? "> consensus failed · validators diverged"
      : "> consensus reached · all validators agree";

  return (
    <div className="code-panel" data-variant={variant}>
      <div className="head">
        <div className="file">
          <span className="label">{label} ▸</span>
          {filename}
        </div>
        <span className={pillClass}>{pillText}</span>
      </div>
      <div
        className={`consensus-row ${variant === "vulnerable" ? "bad" : "ok"}`}
        data-consensus-text={consensusText}
      >
        <span className="consensus-text">{consensusText}</span>
      </div>
      <div className="body">
        <pre>
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              <span className="ln" data-line-index={i + 1}>
                {i + 1}
              </span>
              <span className="line" data-line-index={i + 1}>
                {line === "" ? "\u200B" : line}
              </span>
            </React.Fragment>
          ))}
        </pre>
      </div>
    </div>
  );
}
