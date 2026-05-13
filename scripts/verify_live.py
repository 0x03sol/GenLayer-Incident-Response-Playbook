"""End-to-end audit of what the docs site claims vs. what Bradbury actually shows.

Checks, in order:
  1. Every deploy tx in deployments/bradbury.json is real on Bradbury RPC,
     status is ACCEPTED or FINALIZED, execution is FINISHED_WITH_RETURN, and
     the recipient matches the stored contract address.
  2. Every call tx in deployments/bradbury_calls.json is real on Bradbury RPC
     and its on-chain execution result matches what the JSON records (so the
     'failed' slots really did FINISH_WITH_ERROR and 'success' slots really did
     FINISH_WITH_RETURN).
  3. Every site/public/contracts/*.py is byte-identical to its canonical
     contracts/*.py counterpart (no stale cached copies).
  4. Every (failedTxHash, successTxHash, ...) in site/src/data/modules.ts
     points at a real *call* record and the right *deployment* address.

Exit code 0 on full pass, 1 on any discrepancy.

Run:  python scripts/verify_live.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEPLOYMENTS = ROOT / "deployments" / "bradbury.json"
CALLS = ROOT / "deployments" / "bradbury_calls.json"
CONTRACTS = ROOT / "contracts"
SITE_CONTRACTS = ROOT / "site" / "public" / "contracts"
MODULES_TS = ROOT / "site" / "src" / "data" / "modules.ts"
EXPLORER = "https://explorer-bradbury.genlayer.com"
GOOD_STATUSES = {"ACCEPTED", "FINALIZED"}


def section(title: str) -> None:
    print()
    print("=" * 72)
    print(title)
    print("=" * 72)


def main() -> int:
    failures: list[str] = []

    # 1. deployments -> live chain
    section("1. Bradbury RPC: every DEPLOY tx is real and FINISHED_WITH_RETURN")
    from genlayer_py import create_client, create_account
    from genlayer_py.chains import testnet_bradbury

    client = create_client(chain=testnet_bradbury, account=create_account())
    deploy_records = json.loads(DEPLOYMENTS.read_text(encoding="utf-8"))

    for r in deploy_records:
        tag = f"module {r['module']} [{r['kind']}] {r['file']}"
        try:
            tx = client.get_transaction(transaction_hash=r["tx_hash"])
        except Exception as e:
            failures.append(f"RPC fetch failed for {tag}: {e}")
            print(f"  FAIL {tag:<55}  {e}")
            continue

        status = tx.get("status_name") or tx.get("status") or ""
        exec_r = tx.get("tx_execution_result_name") or tx.get("execution_result") or ""
        recipient = tx.get("recipient") or ""
        problems = []
        if str(status) not in GOOD_STATUSES:
            problems.append(f"status={status}")
        if str(exec_r) != "FINISHED_WITH_RETURN":
            problems.append(f"exec={exec_r}")
        if recipient.lower() != r["address"].lower():
            problems.append(f"recipient mismatch: chain={recipient} local={r['address']}")

        if problems:
            failures.append(f"{tag}: " + "; ".join(problems))
            print(f"  FAIL {tag:<55}  {'; '.join(problems)}")
        else:
            print(f"  OK   {tag:<55}  {status}/{exec_r}")

    # 1b. call txs -> live chain
    section("2. Bradbury RPC: every CALL tx is real and matches recorded exec result")
    call_records = json.loads(CALLS.read_text(encoding="utf-8"))
    for r in call_records:
        tag = f"module {r['module']} [{r['kind']:7}] {r['file']}::{r['method']}"
        if not r.get("tx_hash"):
            failures.append(f"{tag}: no tx_hash on file (client-side rejection)")
            print(f"  FAIL {tag:<70}  no tx_hash")
            continue
        try:
            tx = client.get_transaction(transaction_hash=r["tx_hash"])
        except Exception as e:
            failures.append(f"RPC fetch failed for {tag}: {e}")
            print(f"  FAIL {tag:<70}  {e}")
            continue
        status = tx.get("status_name") or tx.get("status") or ""
        exec_r = tx.get("tx_execution_result_name") or tx.get("execution_result") or ""
        problems = []
        if str(status) not in GOOD_STATUSES and str(status) != "REVEALING":
            problems.append(f"status={status}")
        if str(exec_r) != r["execution_result"]:
            problems.append(f"exec={exec_r} but JSON says {r['execution_result']}")
        if problems:
            failures.append(f"{tag}: " + "; ".join(problems))
            print(f"  FAIL {tag:<70}  {'; '.join(problems)}")
        else:
            print(f"  OK   {tag:<70}  {status}/{exec_r}")

    # 2. site contracts vs canonical
    section("3. Site contract mirrors are byte-identical to canonical source")
    for canon in sorted(CONTRACTS.rglob("*.py")):
        rel = canon.relative_to(CONTRACTS)
        mirror = SITE_CONTRACTS / rel
        if not mirror.exists():
            failures.append(f"missing site mirror: {rel}")
            print(f"  FAIL {rel}  (site mirror missing)")
            continue
        a = canon.read_bytes()
        b = mirror.read_bytes()
        if a != b:
            failures.append(f"drift: site/public/contracts/{rel} != contracts/{rel}")
            print(f"  FAIL {rel}  (content drift: {len(a)} vs {len(b)} bytes)")
        else:
            print(f"  OK   {rel}")

    # 3. modules.ts references -> real call + deploy data
    section("4. modules.ts references are backed by real call txs and deploy addresses")
    deploys_by_module: dict[int, dict[str, dict]] = {}
    for r in deploy_records:
        deploys_by_module.setdefault(r["module"], {})[r["kind"]] = r
    calls_by_module: dict[int, dict[str, dict]] = {}
    for r in call_records:
        calls_by_module.setdefault(r["module"], {})[r["kind"]] = r

    text = MODULES_TS.read_text(encoding="utf-8")
    blocks = re.split(r"(?=\bid:\s*\d+\s*,)", text)
    for blk in blocks:
        m = re.match(r"\s*id:\s*(\d+)", blk)
        if not m:
            continue
        mid = int(m.group(1))

        def pull(field: str, quote: str) -> str | None:
            mo = re.search(rf"{field}:\s*{quote}([^{quote}]*){quote}", blk)
            return mo.group(1) if mo else None

        fields = {
            "failedTxHash":      pull("failedTxHash", '"'),
            "successTxHash":     pull("successTxHash", '"'),
            "failedTxExplorer":  pull("failedTxExplorer", "`"),
            "successTxExplorer": pull("successTxExplorer", "`"),
            "deployToStudioUrl": pull("deployToStudioUrl", "`"),
            "verifyFixUrl":      pull("verifyFixUrl",     "`"),
        }

        dep_kinds = deploys_by_module.get(mid, {})
        call_kinds = calls_by_module.get(mid, {})
        dep_vuln = dep_kinds.get("vulnerable")
        dep_pat  = dep_kinds.get("patched")
        call_fail = call_kinds.get("failed")
        call_succ = call_kinds.get("success")

        problems = []
        if not dep_vuln or not dep_pat:
            problems.append("missing deploy records")
        if not call_fail or not call_succ:
            problems.append("missing call records")
        if not problems:
            if fields["failedTxHash"] != call_fail["tx_hash"]:
                problems.append("failedTxHash != calls[failed].tx_hash")
            if fields["successTxHash"] != call_succ["tx_hash"]:
                problems.append("successTxHash != calls[success].tx_hash")
            if fields["failedTxExplorer"] != f"{EXPLORER}/tx/{call_fail['tx_hash']}":
                problems.append("failedTxExplorer URL drift")
            if fields["successTxExplorer"] != f"{EXPLORER}/tx/{call_succ['tx_hash']}":
                problems.append("successTxExplorer URL drift")
            if fields["deployToStudioUrl"] != f"{EXPLORER}/address/{dep_vuln['address']}":
                problems.append("deployToStudioUrl URL drift")
            if fields["verifyFixUrl"] != f"{EXPLORER}/address/{dep_pat['address']}":
                problems.append("verifyFixUrl URL drift")

        if problems:
            for p in problems:
                failures.append(f"module {mid}: {p}")
            print(f"  FAIL module {mid}: {'; '.join(problems)}")
        else:
            print(f"  OK   module {mid}  tx hashes + addresses match on-chain data")

    section("RESULT")
    if failures:
        print(f"FAIL: {len(failures)} discrepancy/ies")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS: every displayed value is backed by a real Bradbury transaction.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
