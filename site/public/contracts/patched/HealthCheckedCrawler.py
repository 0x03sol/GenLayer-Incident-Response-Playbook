# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *
import json
import re

# Module 6 (Patched) -- Health-checked crawler.
# Defenses:
#   1. URL must be on a mutable allow-list of pre-validated hosts.
#   2. The fetched body is fed through prompt_comparative so validators
#      agree on its semantic content even if rendering differs slightly.
#   3. Bodies that look like challenge pages are rejected (so we never
#      confuse a captcha for content).

DEFAULT_HOSTS = [
    "lite.cnn.com",
    "text.npr.org",
    "news.ycombinator.com",
]

CHALLENGE_MARKERS = [
    "checking your browser",
    "cloudflare",
    "ddos protection",
    "are you human",
    "captcha",
]


class HealthCheckedCrawler(gl.Contract):
    owner: str
    allowed_hosts_json: str
    last_summary: str

    def __init__(self):
        self.owner = str(gl.message.sender_address)
        self.allowed_hosts_json = json.dumps(DEFAULT_HOSTS)
        self.last_summary = ""

    def _require_owner(self) -> None:
        if str(gl.message.sender_address) != self.owner:
            raise Exception("only owner")

    @gl.public.write
    def crawl(self, url: str) -> None:
        m = re.match(r"^https://([^/]+)(/.*)?$", url)
        if not m:
            raise ValueError("https URL required")
        host = m.group(1).lower()
        if host.startswith("www."):
            host = host[4:]
        allowed = json.loads(self.allowed_hosts_json)
        if host not in allowed:
            raise ValueError(f"host not on allow-list: {host}")

        def _fetch() -> str:
            body = gl.nondet.web.render(url, mode="text") or ""
            lower = body.lower()
            for marker in CHALLENGE_MARKERS:
                if marker in lower:
                    raise Exception(f"challenge page detected: {marker}")
            return body[:1000]

        self.last_summary = gl.eq_principle.prompt_comparative(
            _fetch,
            principle="Bodies must convey the same top news content; ignore minor formatting differences.",
        )

    @gl.public.write
    def add_host(self, host: str) -> None:
        self._require_owner()
        allowed = json.loads(self.allowed_hosts_json)
        if host not in allowed:
            allowed.append(host)
            self.allowed_hosts_json = json.dumps(allowed)

    @gl.public.write
    def remove_host(self, host: str) -> None:
        self._require_owner()
        allowed = json.loads(self.allowed_hosts_json)
        allowed = [h for h in allowed if h != host]
        self.allowed_hosts_json = json.dumps(allowed)

    @gl.public.write
    def check_url(self, url: str) -> None:
        """Runs the host allow-list gate only -- no web call, deterministic.
        Demonstrates the first layer of the fix: reject unknown hosts before
        spending gas on a remote render that would likely diverge anyway."""
        m = re.match(r"^https://([^/]+)(/.*)?$", url)
        if not m:
            self.last_summary = "REJECTED: not https"
            return
        host = m.group(1).lower()
        if host.startswith("www."):
            host = host[4:]
        allowed = json.loads(self.allowed_hosts_json)
        self.last_summary = f"ALLOWED: {host}" if host in allowed else f"REJECTED: {host} not on allow-list"

    @gl.public.view
    def get_last_summary(self) -> str:
        return self.last_summary

    @gl.public.view
    def get_allowed_hosts(self) -> str:
        return self.allowed_hosts_json
