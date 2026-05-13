"""Deploy every contract under ./contracts to Bradbury testnet.

Reads GENLAYER_PRIVATE_KEY from .env. Produces deployments/bradbury.json
with one entry per contract:
  { "module": 1, "kind": "vulnerable", "file": "...",
    "tx_hash": "0x...", "address": "0x...",
    "explorer_tx": "...", "explorer_addr": "...",
    "execution_result": "FINISHED_WITH_RETURN" }

The script is idempotent: contracts already present in deployments/bradbury.json
are skipped unless --force is passed.

Usage:
  python scripts/deploy.py             # deploy everything missing
  python scripts/deploy.py --only VulnerableOracle.py
  python scripts/deploy.py --force     # redeploy everything
  python scripts/deploy.py --dry-run   # validate + print plan, no tx
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS_DIR = ROOT / "contracts"
DEPLOYMENTS_DIR = ROOT / "deployments"
DEPLOYMENTS_FILE = DEPLOYMENTS_DIR / "bradbury.json"
EXPLORER = "https://explorer-bradbury.genlayer.com"

# Map filename -> (module_id, kind). Every module now follows the
# vulnerable/patched pair pattern; there is no "demo" kind.
FILE_TO_MODULE: dict[str, tuple[int, str]] = {
    "VulnerableOracle.py":      (1, "vulnerable"),
    "ResilientOracle.py":       (1, "patched"),
    "VulnerableChat.py":        (2, "vulnerable"),
    "HardenedChat.py":          (2, "patched"),
    "VulnerableAPI.py":         (3, "vulnerable"),
    "SafeAPI.py":               (3, "patched"),
    "VulnerablePrice.py":       (4, "vulnerable"),
    "TolerantPrice.py":         (4, "patched"),
    "VulnerableVault.py":       (5, "vulnerable"),
    "SecureVault.py":           (5, "patched"),
    "VulnerableCrawler.py":     (6, "vulnerable"),
    "HealthCheckedCrawler.py":  (6, "patched"),
    "BiasedPrompt.py":          (7, "vulnerable"),
    "HardenedPrompt.py":        (7, "patched"),
    "VulnerableNews.py":        (8, "vulnerable"),
    "WhitelistedNews.py":       (8, "patched"),
}


@dataclass
class Deployment:
    module: int
    kind: str
    file: str
    tx_hash: str
    address: str
    explorer_tx: str
    explorer_addr: str
    execution_result: str
    deployed_at: str


def load_env() -> str:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    pk = os.environ.get("GENLAYER_PRIVATE_KEY", "").strip()
    if not pk:
        sys.exit("error: GENLAYER_PRIVATE_KEY missing in .env")
    if not pk.startswith("0x"):
        pk = "0x" + pk
    if len(pk) != 66:
        sys.exit("error: GENLAYER_PRIVATE_KEY must be 32 bytes (64 hex chars)")
    try:
        int(pk, 16)
    except ValueError:
        sys.exit("error: GENLAYER_PRIVATE_KEY contains non-hex characters")
    return pk


def load_existing() -> list[dict]:
    if not DEPLOYMENTS_FILE.exists():
        return []
    try:
        data = json.loads(DEPLOYMENTS_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("deployments file is not a JSON array")
        return data
    except Exception as e:
        sys.exit(
            f"error: {DEPLOYMENTS_FILE.relative_to(ROOT)} is corrupt ({e}). "
            "Delete it to start fresh, or restore it from git."
        )


def save_deployments(records: list[dict]) -> None:
    DEPLOYMENTS_DIR.mkdir(parents=True, exist_ok=True)
    records_sorted = sorted(records, key=lambda r: (r["module"], r["kind"], r["file"]))
    DEPLOYMENTS_FILE.write_text(
        json.dumps(records_sorted, indent=2) + "\n", encoding="utf-8"
    )


def discover_contracts(only: str | None) -> list[Path]:
    paths = []
    for p in sorted(CONTRACTS_DIR.rglob("*.py")):
        if p.name not in FILE_TO_MODULE:
            print(f"warn: {p.name} not in FILE_TO_MODULE map, skipping", file=sys.stderr)
            continue
        if only and p.name != only:
            continue
        paths.append(p)
    if only and not paths:
        sys.exit(
            f"error: --only {only!r} matched no contract. "
            f"Known contracts: {', '.join(sorted(FILE_TO_MODULE))}"
        )
    return paths


def deploy_one(client, account, path: Path) -> Deployment:
    from genlayer_py.types import TransactionStatus, ExecutionResult

    code = path.read_text(encoding="utf-8")
    module, kind = FILE_TO_MODULE[path.name]

    print(f"  -> deploy_contract({path.name}) ...", flush=True)
    tx_hash = client.deploy_contract(code=code, account=account, args=[])
    if isinstance(tx_hash, dict):
        tx_hash = tx_hash.get("transaction_hash") or tx_hash.get("hash") or str(tx_hash)
    tx_hash_str = str(tx_hash)

    print(f"     tx={tx_hash_str}  waiting for ACCEPTED ...", flush=True)
    try:
        receipt = client.wait_for_transaction_receipt(
            transaction_hash=tx_hash_str,
            status=TransactionStatus.ACCEPTED,
            full_transaction=False,
            retries=40,      # ~2 min total
            interval=3000,
        )
    except Exception as e:
        # Fall back to whatever the network has on file -- if consensus has
        # already settled we still want to record the tx hash + address.
        print(f"     wait_for_receipt timed out ({e.__class__.__name__}); fetching last-known state", flush=True)
        receipt = client.get_transaction(transaction_hash=tx_hash_str)

    addr = (
        receipt.get("recipient")
        or receipt.get("to_address")
        or receipt.get("contract_address")
        or ""
    )
    exec_name = receipt.get("tx_execution_result_name") or receipt.get(
        "execution_result", ""
    )
    if exec_name and exec_name != ExecutionResult.FINISHED_WITH_RETURN.value:
        print(
            f"     ! execution result: {exec_name}  (deploy still finalised; saving anyway)",
            flush=True,
        )

    return Deployment(
        module=module,
        kind=kind,
        file=path.name,
        tx_hash=tx_hash_str,
        address=str(addr),
        explorer_tx=f"{EXPLORER}/tx/{tx_hash_str}",
        explorer_addr=f"{EXPLORER}/address/{addr}" if addr else "",
        execution_result=str(exec_name),
        deployed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="deploy a single file by basename, e.g. VulnerableOracle.py")
    ap.add_argument("--force", action="store_true", help="redeploy even if already in deployments file")
    ap.add_argument("--dry-run", action="store_true", help="show plan, do not deploy")
    args = ap.parse_args()

    pk = load_env()

    from genlayer_py import create_client, create_account
    from genlayer_py.chains import testnet_bradbury

    account = create_account(account_private_key=pk)
    client = create_client(chain=testnet_bradbury, account=account)
    print(f"deployer: {account.address}")
    print(f"chain:    {testnet_bradbury.name}  (id={testnet_bradbury.id})")

    existing = load_existing()
    already = {r["file"] for r in existing} if not args.force else set()

    plan = discover_contracts(args.only)
    plan = [p for p in plan if p.name not in already]
    if not plan:
        print("nothing to deploy (use --force to redeploy)")
        return 0

    print(f"plan: {len(plan)} contract(s)")
    for p in plan:
        m, k = FILE_TO_MODULE[p.name]
        print(f"  - module {m} [{k}]  {p.relative_to(ROOT)}")
    if args.dry_run:
        return 0

    records = [r for r in existing if r["file"] not in {p.name for p in plan}]
    failures: list[tuple[str, str]] = []

    for path in plan:
        try:
            dep = deploy_one(client, account, path)
            records.append(asdict(dep))
            save_deployments(records)  # checkpoint after every success
            print(f"     OK  addr={dep.address}\n")
        except Exception as e:
            print(f"     FAIL {path.name}: {e}\n", file=sys.stderr)
            failures.append((path.name, str(e)))

    print()
    print(f"saved {len(records)} record(s) to {DEPLOYMENTS_FILE.relative_to(ROOT)}")
    if failures:
        print(f"{len(failures)} failure(s):")
        for name, err in failures:
            print(f"  - {name}: {err.splitlines()[0]}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
