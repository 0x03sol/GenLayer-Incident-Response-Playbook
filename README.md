# GenLayer Incident Response Playbook

A security playbook for GenLayer Intelligent Contracts, **proven on-chain**.

Eight failure modes. For each, one vulnerable contract that fails on Bradbury
testnet and one patched contract that succeeds. Every claim in the docs site
resolves to a real transaction hash you can click and verify on the explorer.

- **Live site**: https://gen-layer-incident-response-playboo.vercel.app/
- **Engineering journey**: [Medium · Engineering Journey](https://medium.com/@nabilkoman28/genlayer-incident-response-playbook-engineering-journey-dcd62c1e646e)
- **Author**: [@CijazZamo96896 on X](https://x.com/CijazZamo96896)
- **Network**: Bradbury testnet · chain id `4221` · RPC `https://rpc-bradbury.genlayer.com`
- **License**: MIT — see [LICENSE](LICENSE)

## What is deployed

**16 contracts** on Bradbury — 8 modules, each with a vulnerable and a patched
twin — and **16 transactions** — one failing call and one succeeding call per
module. Authoritative records:

- [`deployments/bradbury.json`](deployments/bradbury.json) — contract addresses + deploy tx hashes
- [`deployments/bradbury_calls.json`](deployments/bradbury_calls.json) — the 16 call receipts cited on the site
- [`deployments/bradbury_onchain_meta.json`](deployments/bradbury_onchain_meta.json) — validators, timestamps, execution result, pulled directly from the RPC

| # | Module                     | Vulnerable               | Patched                    |
|---|----------------------------|--------------------------|----------------------------|
| 1 | URL Rot                    | `VulnerableOracle.py`    | `ResilientOracle.py`       |
| 2 | Prompt Injection           | `VulnerableChat.py`      | `HardenedChat.py`          |
| 3 | API Key Leakage            | `VulnerableAPI.py`       | `SafeAPI.py`               |
| 4 | Wrong Equivalence          | `VulnerablePrice.py`     | `TolerantPrice.py`         |
| 5 | Missing Access Control     | `VulnerableVault.py`     | `SecureVault.py`           |
| 6 | Anti-bot Wall              | `VulnerableCrawler.py`   | `HealthCheckedCrawler.py`  |
| 7 | Validator Disagreement     | `BiasedPrompt.py`        | `HardenedPrompt.py`        |
| 8 | URL Spoofing               | `VulnerableNews.py`      | `WhitelistedNews.py`       |

All 16 transactions are `ACCEPTED` on chain. The failing call for each module
is `FINISHED_WITH_ERROR` (Module 5 is the one exception by design — its
"failure" is `FINISHED_WITH_RETURN` from the *wrong* caller, demonstrating that
a missing access-control check lets the chain accept the call silently). The
succeeding call for each module is `FINISHED_WITH_RETURN`.

## Repo layout

```
contracts/vulnerable/      8 vulnerable contracts (canonical source)
contracts/patched/         8 patched contracts
deployments/
  bradbury.json            16 deploy receipts
  bradbury_calls.json      16 call receipts (one failing + one succeeding per module)
  bradbury_onchain_meta.json   validators / timestamps / exec result from the RPC
scripts/
  validate_contracts.py    studionet schema check (no gas)
  deploy.py                idempotent batch deploy, checkpointed
  trigger_failures.py      executes the failing + succeeding call for every module
  fetch_onchain_meta.py    queries the RPC for validators / timestamps
  sync_modules.py          writes the verified JSON into site/src/data/
  verify_live.py           PASS-gate; refuses to release if any module is unbacked
  serve_site.py            static server used by local verification
site/                      Next.js 14 static export (11 prerendered routes)
JOURNEY.md                 engineering case study (also published on Medium)
```

## Reproduce from scratch

Prerequisites: Python 3.12+, Node 18+, a Bradbury wallet with ~0.05 GEN.

```powershell
# 1. Python env
uv venv --python 3.14 .venv
uv pip install --python .\.venv\Scripts\python.exe -r requirements.txt

# 2. Deployer wallet
Copy-Item .env.example .env
# Edit .env: set GENLAYER_PRIVATE_KEY=0x...    (NEVER commit this file)

# 3. Offline schema check on studionet -- no gas spent
.\.venv\Scripts\python.exe scripts\validate_contracts.py

# 4. Deploy. Idempotent: skips already-deployed contracts.
.\.venv\Scripts\python.exe scripts\deploy.py --dry-run     # plan only
.\.venv\Scripts\python.exe scripts\deploy.py               # for real
# Pass --force to redeploy from scratch.

# 5. Trigger one failing + one succeeding call per module
.\.venv\Scripts\python.exe scripts\trigger_failures.py

# 6. Pull validators, timestamps, exec result from the RPC
.\.venv\Scripts\python.exe scripts\fetch_onchain_meta.py

# 7. Write the verified JSON into the React data layer
.\.venv\Scripts\python.exe scripts\sync_modules.py

# 8. PASS-gate -- refuses to continue if any module is missing a real on-chain pair
.\.venv\Scripts\python.exe scripts\verify_live.py

# 9. Build the static site
cd site
npm install
npm run build        # static export to site/dist/
```

`scripts/deploy.py` checkpoints after every successful contract; a mid-batch
RPC timeout resumes where it left off on the next run. End-to-end from a clean
clone is about 10–15 minutes, most of which is waiting for Bradbury to finalise
the calls.

## SDK notes

Contracts use the `genlayer-py` runtime. A few things that bit me and might
bite you:

- The `# { "Depends": "py-genlayer:..." }` header is required — it pins the
  runtime version. Forget it and deployment fails with a generic error.
- `from genlayer import *` exposes `gl.*`.
- `gl.nondet.web.render(url, mode='text'|'html')` must be wrapped by either
  `gl.eq_principle.strict_eq(fn)` (deterministic content) or
  `gl.eq_principle.prompt_comparative(fn, principle=...)` (drifting / LLM
  content). The wrapper is the consensus contract; without it the call does
  not even submit for validation.
- `gl.nondet.exec_prompt(prompt)` is the right way to invoke an LLM — never
  embed a third-party API key in contract state (Module 3 demonstrates why:
  every validator can read it).
- `gl.message.sender_address` is an `Address`, not a string. Cast with
  `str()` before doing equality checks.
- Bradbury's RPC does not expose `genlayer_getContractSchemaForCode`, so
  `scripts/validate_contracts.py` targets `studionet` — same toolchain, same
  compiler, free schema checks.

## Security

- The deployer private key lives only in `.env`, which is git-ignored. The
  `.env.example` file in the repo contains no values. Rotate any key that has
  ever been on screen or in a clipboard.
- [`contracts/vulnerable/VulnerableAPI.py`](contracts/vulnerable/VulnerableAPI.py)
  contains a literal `LEAKED_API_KEY = "FAKE-demo-key-do-not-use-..."` string.
  This is **intentional and fake** — Module 3's lesson is that a real key in
  this position would be readable by every validator. Do not treat it as a
  leaked credential.
- The tracked deployment JSONs contain transaction hashes and contract
  addresses, which are public chain data by definition. No private state is
  embedded.

## Read more

For the full engineering journey — what was real vs simulated, the build
pipeline, decisions I would defend, and what I learned about the SDK — see
[`JOURNEY.md`](JOURNEY.md) (also published on
[Medium](https://medium.com/@nabilkoman28/genlayer-incident-response-playbook-engineering-journey-dcd62c1e646e)).
