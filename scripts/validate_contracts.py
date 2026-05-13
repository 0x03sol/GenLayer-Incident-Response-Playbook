"""Static validation for every contract in ./contracts.

Runs each contract through genlayer-py's schema extractor via the Studio
network RPC (free, no wallet, no gas). Catches missing Depends headers,
syntax errors, unsupported imports, and bad storage type annotations --
the same things Bradbury will reject at deploy time. Requires internet
access to studio.genlayer.com.

Run:  python scripts/validate_contracts.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS_DIR = ROOT / "contracts"


def main() -> int:
    from genlayer_py import create_client, create_account
    from genlayer_py.chains import studionet

    # The schema endpoint is not exposed on Bradbury, but it is on the Studio
    # network and uses the exact same py-genlayer toolchain, so this is the
    # right pre-flight check before paying gas on testnet.
    client = create_client(chain=studionet, account=create_account())

    files = sorted(CONTRACTS_DIR.rglob("*.py"))
    if not files:
        print("no contracts found", file=sys.stderr)
        return 1

    failures: list[tuple[Path, str]] = []
    for path in files:
        code = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT)
        try:
            schema = client.get_contract_schema_for_code(contract_code=code)
            ctor = schema.get("ctor", {}).get("params", []) if isinstance(schema, dict) else []
            methods = list(schema.get("methods", {}).keys()) if isinstance(schema, dict) else []
            print(f"OK   {rel}  ctor={len(ctor)}  methods={len(methods)}")
        except Exception as e:
            failures.append((rel, str(e)))
            print(f"FAIL {rel}\n     -> {e}")

    print()
    if failures:
        print(f"{len(failures)} contract(s) failed validation:")
        for rel, err in failures:
            print(f"  - {rel}: {err.splitlines()[0]}")
        return 1
    print(f"All {len(files)} contracts compile cleanly.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
