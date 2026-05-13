# GenLayer Incident Response Playbook — Living Security Docs

## Portal Task to Submit Under
**Documentation** (20–1000 pts)

## Estimated Points
- 600–1000 pts (only 6 contributions, 5 builders. Underserved. High quality = high points.)

## Why It Wins (Based on Accepted Projects + Official Docs)
Gotham Court was praised for "prompt-injection-hardened evidence pipeline." The official docs warn about URL fragility, API key leakage, prompt injection, equivalence principle mismatch, and malicious validator coalitions. **But no one has consolidated these into an interactive, transaction-proven security guide.** This is a living document where each vulnerability is demonstrated with a REAL failed transaction on Bradbury, then shows the patched version succeeding.

## What It Does
Interactive documentation site with 8 attack/defense modules. Each module:
1. Describes the vulnerability in plain English
2. Shows a VULNERABLE contract code snippet
3. Has a "Deploy to Studio" button importing the vulnerable contract
4. Shows the **actual failed transaction** on Bradbury Explorer (tx hash, error logs, validator disagreement)
5. Shows the **PATCHED** contract
6. Has a "Verify Fix" button that runs the patched version and shows success
7. Quiz at the end to test understanding

## The 8 Modules

### Module 1: URL Rot — The Disappearing Oracle
**Attack**: Hardcode a URL. Site goes down or changes anti-bot policy. Contract fails forever.
**Fix**: Domain whitelisting + fallback list.
**Contract**: `VulnerableOracle.py` → `ResilientOracle.py`

### Module 2: Prompt Injection — The Trojan Prompt
**Attack**: User input contains hidden instructions that hijack the LLM.
**Fix**: Input sanitization + greyboxing pre-filters.
**Contract**: `VulnerableChat.py` → `HardenedChat.py`

### Module 3: API Key Leakage — The Transparent Secret
**Attack**: Hardcode OPENAI_API_KEY in contract. Validators can read it.
**Fix**: Never put secrets in contracts. Use proxy patterns or off-chain pre-processing.
**Contract**: `VulnerableAPI.py` → `SafeAPI.py`

### Module 4: Wrong Equivalence — The Precision Trap
**Attack**: Use `strict_eq` for live ETH price. Validators get slightly different numbers. Consensus fails.
**Fix**: Use `custom` equivalence with tolerance ranges for volatile data.
**Contract**: `VulnerablePrice.py` → `TolerantPrice.py`

### Module 5: Missing Access Control — The Open Door
**Attack**: `@gl.public.write` method has no owner check. Anyone can drain state.
**Fix**: `require_sender(self._owner)` or role-based access.
**Contract**: `VulnerableVault.py` → `SecureVault.py`

### Module 6: Cloudflare Block — The Invisible Wall
**Attack**: Target URL is behind Cloudflare. `web.render()` returns challenge page, not content.
**Fix**: Pre-verify URLs with Intelligent Crawler. Maintain on-chain URL health registry.
**Contract**: `VulnerableCrawler.py` → `HealthCheckedCrawler.py`

### Module 7: Malicious Validator Coalition — The 51% AI
**Attack**: What if validators collude? How does Optimistic Democracy handle it?
**Fix**: Appeals mechanism + increasing validator set size + model diversity.
**Demonstration**: Run a contract with intentionally biased prompt to test appeal window.

### Module 8: URL Spoofing — The Fake Source
**Attack**: Malicious actor spins up a fake news site clone to feed false data.
**Fix**: Domain whitelisting as mutable state, not static code.
**Contract**: `VulnerableNews.py` → `WhitelistedNews.py`

## Build Plan
1. Week 1: Write all 8 vulnerable contracts + 8 patched contracts
2. Week 2: Deploy all 16 to Bradbury, save transaction hashes (failures + successes)
3. Week 3: Build interactive documentation site (Next.js or Vite) with embedded Studio imports
4. Week 4: Add quiz system + progress tracking
5. Week 5: Submit to Documentation portal with live site + GitHub repo

## Why Only GenLayer Can Do This
Traditional docs are static text. This playbook is **proven by on-chain consensus** — the AI validators themselves demonstrate the vulnerability by failing to reach consensus. The security of the documentation is guaranteed by the same mechanism it teaches.
