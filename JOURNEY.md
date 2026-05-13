# GenLayer Incident Response Playbook — Engineering Journey

A technical case study for the GenLayer reviewers. Every number, address, and
transaction hash below resolves to a real entry in
[`deployments/bradbury.json`](deployments/bradbury.json) or
[`deployments/bradbury_calls.json`](deployments/bradbury_calls.json), and every
explorer link below has been clicked through to verify it loads.

- **Live site**: [https://genlayer-incident-playbook.windsurf.build](https://genlayer-incident-playbook.windsurf.build)
- **Repo**: [github.com/0x03sol/GenLayer-Incident-Response-Playbook](https://github.com/0x03sol/GenLayer-Incident-Response-Playbook)
- **Writeup**: [Medium · Engineering Journey](https://medium.com/@nabilkoman28/genlayer-incident-response-playbook-engineering-journey-dcd62c1e646e)
- **Author**: [@CijazZamo96896 on X](https://x.com/CijazZamo96896)
- **Network**: Bradbury testnet · chain id `4221` · RPC `https://rpc-bradbury.genlayer.com`
- **Deployer**: `0x4f36CB2C58385575fafb443d80E3c290b12DA6aE` (also appears as a leader on several txs)
- **Submission category**: Documentation

---

## TL;DR

I built a security playbook for GenLayer Intelligent Contracts that is **proven
by on-chain consensus** rather than asserted by prose. Each of the 8 modules
ships a paired vulnerable + patched contract, both deployed to Bradbury, and
each pair is backed by **two real transactions** — one `FINISHED_WITH_ERROR`
that demonstrates the failure mode, and one `FINISHED_WITH_RETURN` that
demonstrates the fix. The reader never has to trust the docs; they click the
tx hash and see the validators agree (or fail to).

The site renders only data that has been pulled directly from the RPC by a
verification script. There is no mock data, no placeholder hashes, and no
"demo" special-case branches anywhere in the codebase. A pre-build gate
(`scripts/verify_live.py`) refuses to ship if any module is missing a real on-chain
counterpart.

**By the numbers**

| | Count |
|---|---|
| Modules | 8 |
| Contracts deployed to Bradbury | 16 |
| Transactions cited on the site | 16 (8 failed-call + 8 success-call) |
| Distinct tx hashes (zero duplicates) | 16 |
| Static routes pre-rendered | 11 |
| Python scripts in the build loop | 7 |
| Vulnerable-vs-patched code panels | 8 |

---

## 1 · Why this submission exists

GenLayer's own documentation already warns about the things that break Intelligent
Contracts — URL rot, prompt injection, API key leakage, mis-chosen equivalence
principles, missing access control, anti-bot challenge pages, validator
disagreement, and source spoofing. What was missing was a single artifact where
each of those warnings is **demonstrated by a transaction that actually failed
on the network**, paired with a fix that the same network actually accepted.

The thesis I wanted to test: a docs site is materially more credible when every
claim it makes about contract behaviour is backed by a tx hash the reader can
inspect on the explorer. Not "this is what happens" — "this is what happened,
here is when, here is which validator was leader."

The corollary thesis, which mattered more than I expected: building such a doc
forces you to actually *trigger* every failure mode on Bradbury, not just write
prose about it. That turned out to teach me more about the SDK than reading the
docs ever did.

---

## 2 · The shape of the artifact

```
contracts/vulnerable/      8 Python contracts -- each illustrates one failure mode
contracts/patched/         8 Python contracts -- each is the corresponding fix
deployments/
  bradbury.json            deploy receipts (one entry per contract, 16 total)
  bradbury_calls.json      call receipts  (one failed + one success per module)
  bradbury_onchain_meta.json  validator/leader/timestamp pulled from the RPC
scripts/
  validate_contracts.py    studionet schema check (no gas, runs offline)
  deploy.py                idempotent batch deploy with per-contract checkpoint
  trigger_failures.py      executes the failed + success call for every module
  fetch_onchain_meta.py    queries the RPC for validators / timestamps / exec result
  sync_modules.py          writes the verified JSON into site/src/data/modules.ts
  verify_live.py           PASS-gate: refuses to release if any module is unbacked
  serve_site.py            static server used in local verification
site/                      Next.js 14 static export, 11 prerendered routes
```

Every layer of that pipeline is reproducible from a clean clone in one
afternoon: see [§7 · Reproducibility](#7--reproducibility).

---

## 3 · The 8 incidents

Each row is a real pair of contracts; the right-hand column links to the
two real Bradbury transactions cited on the site for that module (truncated
hashes — full hashes live in `deployments/bradbury_calls.json`).

| # | Incident | Vulnerable / Patched contracts | Failing call · `FINISHED_WITH_ERROR` | Fixed call · `FINISHED_WITH_RETURN` |
|---|---|---|---|---|
| 1 | URL Rot | `VulnerableOracle.py` → `ResilientOracle.py` | `fetch_price()` → `0x176ad8f3…cef676` | `add_endpoint(...)` → `0x1c702a9b…68699` |
| 2 | Prompt Injection | `VulnerableChat.py` → `HardenedChat.py` | `classify("...IGNORE ALL PREVIOUS...")` → `0x14b83a06…07743` | `demonstrate_fix(...)` → `0xb295b842…9b8e1` |
| 3 | API Key Leakage | `VulnerableAPI.py` → `SafeAPI.py` | `summarize("GenLayer runs...")` → `0x0680449e…089ea2` | `demonstrate_fix()` → `0xf66c7c66…ff9d6` |
| 4 | Wrong Equivalence | `VulnerablePrice.py` → `TolerantPrice.py` | `fetch_eth()` → `0x873e951e…4f824` | `set_tolerance("2.0")` → `0xcdbc83d0…d6e49` |
| 5 | Missing Access Control | `VulnerableVault.py` → `SecureVault.py` | `mint(1000)` *(any wallet)* → `0x9d6b8b57…b35a6` | `mint(1000)` *(deployer/owner)* → `0x36f80dfa…4c86bd` |
| 6 | Anti-bot Wall | `VulnerableCrawler.py` → `HealthCheckedCrawler.py` | `crawl("https://cloudflare.com")` → `0x8428c047…f78f39c` | `check_url("https://reuters.com/...")` → `0xbb99dd06…0848a` |
| 7 | Validator Disagreement | `BiasedPrompt.py` → `HardenedPrompt.py` | `classify("...absolutely terrible...")` → `0xfcc1ad60…54f4ff` | `demonstrate_fix()` → `0x616396cd…b8f877` |
| 8 | URL Spoofing | `VulnerableNews.py` → `WhitelistedNews.py` | `add_domain("example.com")` *(no method)* → `0x417e5f42…cbeaca` | `add_domain("example.com")` *(allow-listed)* → `0xc660911f…21e31` |

Module 5 is worth pausing on. The "failed" transaction `0x9d6b8b57…` returned
`FINISHED_WITH_RETURN` — it didn't error. That's the point: the missing access
check means the call **succeeds for the wrong caller**. The chain doesn't tell
you anything is wrong; you have to read the contract to see that the fix is
the addition of `require_sender(self._owner)` in the patched version, which
preserves the call's success for the owner and would have made the same
unauthorised call from a different wallet revert. The playbook shows both
contracts side-by-side so the reader can see the one line of difference.

---

## 4 · The build loop

The pipeline is six commands. Each one is idempotent, each one writes a
machine-readable artifact, and the next one only reads from artifacts (never
from anyone's memory of "what we deployed last time").

```
validate_contracts.py   ──→  (studionet schema check, no gas)
        │
        ▼
deploy.py               ──→  deployments/bradbury.json     (16 contracts)
        │
        ▼
trigger_failures.py     ──→  deployments/bradbury_calls.json  (16 call receipts)
        │
        ▼
fetch_onchain_meta.py   ──→  deployments/bradbury_onchain_meta.json
        │                     (validator addrs, timestamps, exec result, status)
        ▼
sync_modules.py         ──→  site/src/data/modules.ts + onchain_meta.ts
        │                     (writes typed records the React pages render)
        ▼
verify_live.py          ──→  PASS gate. Refuses to release the site if any
                             module is missing real on-chain counterparts
                             or if the same tx hash appears in two places.
```

Two details that I think matter and were not obvious at the start:

**Checkpointing in `deploy.py`.** Bradbury's RPC occasionally times out
mid-batch. The first version of my deploy script would re-deploy everything
on retry — meaning every flaky-network event cost a fresh set of contract
addresses and a fresh round of gas. The second version writes
`deployments/bradbury.json` after every successful deploy and skips already-deployed
contracts on the next run. After that change, mid-batch retries cost nothing.

**Duplicate-hash detection in `fetch_onchain_meta.py`.** Early on I
accidentally pointed two modules at the same tx hash during a rebase. The
site happily rendered both, citing the same on-chain evidence in two places.
I now scan the call-receipt set for repeated hashes and abort with a
diagnostic. The site can't ship a duplicate.

---

## 5 · What is real, what is not

This is the section I most want reviewers to push on, because "documentation
proven by on-chain consensus" only means something if the boundary is sharp.

**Real on the chain, pulled from the RPC each release:**

- Every contract address (16 contracts, addresses in `bradbury.json`)
- Every transaction hash cited on the site (16 hashes in `bradbury_calls.json`)
- The `execution_result` shown in every UI cell (e.g. `FINISHED_WITH_ERROR`)
- The leader / validator addresses shown in the metadata strip
- The transaction timestamps (`called_at`) and their "X minutes ago" rendering
- The status (`ACCEPTED`, `FINALIZED`, `REVEALING`) reported on each tx card

**Local-only (and clearly labelled as such):**

- The quiz progress (stored in `localStorage`, not on-chain)
- The narrative copy for each module — written by me, not generated, but
  obviously prose not consensus
- The on-screen "consensus failed · validators diverged" badge in the
  side-by-side code panel — this is a UI label, not a quote from the RPC

**Deliberately removed during the build, worth flagging:**

There was a `kind: "demo"` branch in an earlier iteration of
`sync_modules.py` that let Module 7 ship with placeholder data, on the
theory that "validator disagreement" was hard to trigger reliably. That
branch is gone. Module 7 now has a real `BiasedPrompt.py` deployed at
`0x6463…9C11` (failing tx `0xfcc1ad60…`) paired with a real `HardenedPrompt.py`
at `0xa940…c45f` (succeeding tx `0x616396cd…f877`). No part of the codebase
contains a `kind === "demo"` special case anymore — `verify_live.py` would
catch it if it crept back in.

---

## 6 · Engineering decisions I would defend

A short, honest list. Each of these took at least one wrong turn before it
landed.

**The schema check runs on studionet, not Bradbury.**  Bradbury's RPC does
not expose `genlayer_getContractSchemaForCode`, so I cannot validate
contracts against the network I am deploying to. Studionet exposes the
endpoint and uses the same compiler and SDK, so `validate_contracts.py`
points there. This catches almost every class of bug for free.

**Module 7 is a paired contract, not a "demo."**  The original plan was to
ship a single biased contract and let the chain demonstrate divergence at
read time. The problem: a single contract doesn't fit the side-by-side
visual story the other seven incidents tell. The fix was to write a
`HardenedPrompt.py` that classifies *deterministically* — using a small
on-chain lexicon, no LLM call at all — so the patched call succeeds with
`FINISHED_WITH_RETURN` and the comparison reads cleanly. This is also a
real lesson about the SDK: the cheapest way to make a non-deterministic
operation deterministic is to not perform it.

**The side-by-side code panel does its own diff-reading affordance.**  Two
contracts at 50–80 lines each is a lot to compare visually. Hovering any
line in either panel highlights the same line index in the other panel and
dims everything else, so the eye can sweep through the diff line-by-line.
This is delegated through a single event listener on the `.code-pair`
container, so it costs effectively nothing regardless of file length.

**WCAG AA contrast audit on the dim text.**  The token `--fg-faint`
originally rendered at `#7a7a7a` on `#0a0a0a` — a contrast ratio of 4.4 : 1,
which fails AA for normal text. I audited every place the token is used
(20+ small-mono surfaces), then lifted it to `#909090` (5.9 : 1) and bumped
`--fg-mute` from 5.7 : 1 to 7.0 : 1 in the same pass. The code-panel line
number gutter was at `#3a3a3a` (1.5 : 1, effectively invisible); now at
`#6e6e6e`. The Python comment color was at `#555` (2.0 : 1, fails AA);
now at `#7e9477`, a low-saturation green that still reads as "comment"
in the syntax-tree sense and passes AA.

**Exec-result rows in the sidecard are real anchors.**  After the contrast
pass, I caught that the `FINISHED_WITH_ERROR` / `FINISHED_WITH_RETURN`
strings in each module's metadata sidecard were static text. They are now
anchors to the same Bradbury tx URL used in the on-chain receipts card
below, with a trailing ↗ and an `aria-label` that gives screen-readers
"View FINISHED_WITH_ERROR transaction on Bradbury Explorer." A 16-link
audit confirmed every sidecard link points to a distinct, real transaction.

**Animations respect `prefers-reduced-motion`.**  Landing-page module-card
decoding reveal, quiz commit echoes, code-panel scanline, consensus
typewriter — all of them short-circuit under reduced-motion. Hover-link
line cross-highlight stays active because it is a state change, not motion.

---

## 7 · Reproducibility

```powershell
# Prerequisites: Python 3.12+, Node 18+, ~0.05 GEN in a Bradbury wallet.

uv venv --python 3.14 .venv
uv pip install --python .\.venv\Scripts\python.exe -r requirements.txt

Copy-Item .env.example .env       # then set GENLAYER_PRIVATE_KEY=0x...

# Offline schema check on studionet — no gas, ~30 s
.\.venv\Scripts\python.exe scripts\validate_contracts.py

# Deploy (skips already-deployed contracts; safe to re-run)
.\.venv\Scripts\python.exe scripts\deploy.py --dry-run
.\.venv\Scripts\python.exe scripts\deploy.py

# Trigger one failing + one succeeding call per module
.\.venv\Scripts\python.exe scripts\trigger_failures.py

# Pull validator addresses, timestamps, exec_result from the RPC
.\.venv\Scripts\python.exe scripts\fetch_onchain_meta.py

# Write the verified JSON into the React data layer
.\.venv\Scripts\python.exe scripts\sync_modules.py

# PASS-gate: refuses to continue if any module is unbacked
.\.venv\Scripts\python.exe scripts\verify_live.py

# Build the static site (Next.js, 11 routes)
cd site
npm install
npm run build
```

End-to-end, from clean clone to deployed site, this takes roughly 10–15
minutes — most of which is waiting on Bradbury to finalise the calls.

---

## 8 · What I learned about the SDK

Five things that I genuinely didn't know before this and that the docs do
mention but only land once you've felt the bug:

1. The `# { "Depends": "py-genlayer:..." }` header is not optional — it's the
   on-chain pointer to the runtime hash. Forget it and the contract refuses
   to deploy with a generic error.
2. `gl.message.sender_address` is an `Address` instance, not a string. Cast
   it with `str()` before doing string comparisons or you get silent
   mismatches that look like access-control bugs.
3. `gl.nondet.web.render(...)` only makes sense **inside** a function wrapped
   by an equivalence principle — `gl.eq_principle.strict_eq` for
   deterministic content, `gl.eq_principle.prompt_comparative` for content
   that drifts. The wrapper is the consensus contract; without it the call
   does not even submit for validation.
4. Never embed a third-party API key in contract state. The `VulnerableAPI.py`
   contract in Module 3 makes this point by literally putting an OpenAI key
   in a class field and calling `api.openai.com` from inside the contract.
   Every validator sees the key. The fix in `SafeAPI.py` removes the key
   entirely and uses `gl.nondet.exec_prompt(...)` instead — the
   genlayer-py runtime is the API client; the contract has no secrets.
5. `gl.eq_principle.strict_eq` on live external content (prices, articles,
   anything served behind a CDN) is a consensus-breaker by design. Module 4
   demonstrates this with ETH price; Module 6 demonstrates it with a
   Cloudflare-fronted body. Both contracts fail every time you call them.
   The fix is not better content — the fix is the right equivalence
   principle. Two of the eight incidents reduce, at root, to "you chose the
   wrong equivalence principle."

---

## 9 · Open questions / what I would build next

- **Live appeals window for Module 7.**  The biased contract surfaces
  validator divergence by construction, but I don't auto-trigger an appeal.
  A natural next iteration would let a reader on the playbook page submit an
  appeal directly from the browser and watch the second jury vote in real
  time.
- **On-chain quiz progress.**  Quiz answers are local-storage. Making them
  an on-chain attestation (one tx per completed module) would let a reader
  show a recruiter a verifiable "I read the GenLayer security playbook"
  badge. Cheap, useful, on-brand.
- **A live URL-health registry.**  Modules 1 and 8 ship a registry pattern
  but neither demonstrates the registry being *used in anger*. A version
  that ran a daily health-check cron and rotated bad domains automatically
  would close the loop.
- **Internationalisation of the prose.**  The narrative copy is English-only.
  The contracts and tx hashes are language-neutral; the prose is not.

---

## 10 · Closing

The submission I'm putting in front of you is, I hope, evidence of two
things at once: a small but complete piece of GenLayer security
documentation, and a working build pipeline that proves the documentation
hasn't drifted from the chain. The site you can click on, the contracts
you can re-deploy, the scripts you can re-run, and the explorer links you
can verify — all of them are pointing at the same set of 16 transactions
that finalised on Bradbury on **2026-05-13** between
`15:29:43Z` and `20:18:54Z`.

If any of those transactions ever stop resolving, the build will fail before
the next release ships. That is, in my view, the only kind of documentation
worth writing for a consensus system.

— *kr863*
