"""Wire real Bradbury *call* data into site/src/data/modules.ts.

Reads:
  deployments/bradbury.json         -> contract addresses (for Open-* buttons)
  deployments/bradbury_calls.json   -> call tx hashes (for Failed TX / Success TX)

Rewrites per-module fields in modules.ts:
    failedTxHash       <- call_of_vulnerable.tx_hash
    successTxHash      <- call_of_patched.tx_hash (falls back to failed for mod 7)
    failedTxExplorer   <- explorer/tx/<failedTxHash>
    successTxExplorer  <- explorer/tx/<successTxHash>
    failedExecResult   <- e.g. "FINISHED_WITH_ERROR"
    successExecResult  <- e.g. "FINISHED_WITH_RETURN"
    failedCallMethod   <- e.g. "fetch_price()"
    successCallMethod  <- e.g. "add_endpoint(\"...\")"
    failedNarrative    <- one-line why it failed
    successNarrative   <- one-line why the fix works
    deployToStudioUrl  <- explorer/address/<vulnerable_address>
    verifyFixUrl       <- explorer/address/<patched_address>

Run:  python scripts/sync_modules.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEPLOYMENTS = ROOT / "deployments" / "bradbury.json"
CALLS = ROOT / "deployments" / "bradbury_calls.json"
MODULES_TS = ROOT / "site" / "src" / "data" / "modules.ts"
EXPLORER = "https://explorer-bradbury.genlayer.com"


def load_deployments() -> dict[int, dict[str, dict]]:
    out: dict[int, dict[str, dict]] = {}
    for r in json.loads(DEPLOYMENTS.read_text(encoding="utf-8")):
        out.setdefault(r["module"], {})[r["kind"]] = r
    return out


def load_calls() -> dict[int, dict[str, dict]]:
    out: dict[int, dict[str, dict]] = {}
    for r in json.loads(CALLS.read_text(encoding="utf-8")):
        out.setdefault(r["module"], {})[r["kind"]] = r
    return out


def fmt_call(rec: dict) -> str:
    """Render a method invocation as a readable one-liner."""
    if not rec:
        return ""
    args = rec.get("args", []) or []
    rendered = ", ".join(_fmt_arg(a) for a in args)
    return f"{rec['method']}({rendered})"


def _fmt_arg(a) -> str:
    if isinstance(a, str):
        if len(a) > 40:
            return json.dumps(a[:37] + "...")
        return json.dumps(a)
    return repr(a)


def ts_str(s: str) -> str:
    """TypeScript double-quoted string literal."""
    return json.dumps(s)


def ts_backtick(s: str) -> str:
    """TypeScript template-literal string. We don't use interpolation."""
    escaped = s.replace("\\", "\\\\").replace("`", "\\`")
    return "`" + escaped + "`"


def build_field_values(module_id: int, deps: dict, calls: dict) -> dict[str, str]:
    """Compute every field that sync_modules will inject, for one module."""
    # Deployment records (for addresses).
    vuln_dep = deps.get("vulnerable")
    pat_dep = deps.get("patched")
    assert vuln_dep and pat_dep, f"module {module_id}: missing deployment record"

    # Call records (for tx hashes).
    failed_call = calls.get("failed")
    success_call = calls.get("success")
    assert failed_call, f"module {module_id}: missing 'failed' call record"
    assert success_call, f"module {module_id}: missing 'success' call record"

    return {
        "failedTxHash":       ts_str(failed_call["tx_hash"] or ""),
        "successTxHash":      ts_str(success_call["tx_hash"] or ""),
        "failedTxExplorer":   ts_backtick(f"{EXPLORER}/tx/{failed_call['tx_hash']}") if failed_call["tx_hash"] else ts_backtick(failed_call["explorer_tx"]),
        "successTxExplorer":  ts_backtick(f"{EXPLORER}/tx/{success_call['tx_hash']}") if success_call["tx_hash"] else ts_backtick(success_call["explorer_tx"]),
        "failedExecResult":   ts_str(failed_call["execution_result"]),
        "successExecResult":  ts_str(success_call["execution_result"]),
        "failedCallMethod":   ts_str(fmt_call(failed_call)),
        "successCallMethod":  ts_str(fmt_call(success_call)),
        "failedNarrative":    ts_str(failed_call.get("narrative", "")),
        "successNarrative":   ts_str(success_call.get("narrative", "")),
        "deployToStudioUrl":  ts_backtick(f"{EXPLORER}/address/{vuln_dep['address']}"),
        "verifyFixUrl":       ts_backtick(f"{EXPLORER}/address/{pat_dep['address']}"),
    }


NEW_FIELDS_IN_INSERT_ORDER = [
    "failedExecResult", "successExecResult",
    "failedCallMethod", "successCallMethod",
    "failedNarrative",  "successNarrative",
]


def patch_block(block: str, values: dict[str, str]) -> str:
    """Update or insert every managed field inside one module's `{...}` block."""
    # JSON-aware string matchers -- handle escaped quotes and backticks.
    DQ = r'"(?:\\.|[^"\\])*"'
    BT = r'`(?:\\.|[^`\\])*`'

    # 1. Update fields that already exist (failedTxHash, successTxHash,
    #    failedTxExplorer, successTxExplorer, deployToStudioUrl, verifyFixUrl).
    for key in ("failedTxHash", "successTxHash"):
        block = re.sub(
            rf'({re.escape(key)}:\s*){DQ}',
            lambda m, v=values[key]: m.group(1) + v,
            block,
        )
    for key in ("failedTxExplorer", "successTxExplorer", "deployToStudioUrl", "verifyFixUrl"):
        block = re.sub(
            rf'({re.escape(key)}:\s*){BT}',
            lambda m, v=values[key]: m.group(1) + v,
            block,
        )

    # 2. Insert new fields if they aren't there yet; otherwise update in place.
    for key in NEW_FIELDS_IN_INSERT_ORDER:
        if re.search(rf"{re.escape(key)}:\s*", block):
            block = re.sub(
                rf'({re.escape(key)}:\s*){DQ}',
                lambda m, v=values[key]: m.group(1) + v,
                block,
            )
        else:
            # Insert before `quiz: [` line, preserving indentation.
            quiz_m = re.search(r"(\n\s*)quiz:\s*\[", block)
            if not quiz_m:
                raise RuntimeError("couldn't find quiz: [ to anchor field insert")
            indent = quiz_m.group(1)
            insertion = f"{indent}{key}: {values[key]},"
            block = block[: quiz_m.start()] + insertion + block[quiz_m.start():]

    return block


def main() -> int:
    if not DEPLOYMENTS.exists():
        sys.exit("error: deployments/bradbury.json missing -- run scripts/deploy.py")
    if not CALLS.exists():
        sys.exit("error: deployments/bradbury_calls.json missing -- run scripts/trigger_failures.py")

    deployments = load_deployments()
    calls = load_calls()
    text = MODULES_TS.read_text(encoding="utf-8")

    # Split into per-module blocks by locating `id: N,` anchors.
    block_re = re.compile(r"(\bid:\s*(\d+)\s*,.*?)(?=\bid:\s*\d+\s*,|];)", re.DOTALL)
    out = []
    last_end = 0
    for m in block_re.finditer(text):
        out.append(text[last_end:m.start(1)])
        mid = int(m.group(2))
        values = build_field_values(mid, deployments.get(mid, {}), calls.get(mid, {}))
        out.append(patch_block(m.group(1), values))
        last_end = m.end(1)
        print(f"  patched module {mid}")
    out.append(text[last_end:])

    MODULES_TS.write_text("".join(out), encoding="utf-8")
    print(f"\nwrote {MODULES_TS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
