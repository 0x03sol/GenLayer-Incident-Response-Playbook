# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *
import json
import re

# Module 8 (Patched) -- Mutable whitelist with governance.
# Defenses:
#   1. Domain set lives in storage; owner can add/remove without
#      redeploying.
#   2. Strict eTLD parsing prevents `reuters.com.attacker.example` from
#      matching `reuters.com`.
#   3. Lightweight proposal/vote flow lets multiple signers add a domain.

INITIAL_DOMAINS = ("reuters.com", "bbc.com", "apnews.com")
GOVERNANCE_THRESHOLD = 3


class WhitelistedNews(gl.Contract):
    owner: str
    trusted_json: str          # {"reuters.com": true, ...}
    proposals_json: str        # {"newsource.com": ["0x..", "0x.."]}
    last_status: str

    def __init__(self):
        self.owner = str(gl.message.sender_address)
        self.trusted_json = json.dumps({d: True for d in INITIAL_DOMAINS})
        self.proposals_json = "{}"
        self.last_status = ""

    def _require_owner(self) -> None:
        if str(gl.message.sender_address) != self.owner:
            raise Exception("only owner")

    @staticmethod
    def _host_of(url: str) -> str:
        m = re.match(r"^https?://([^/?#]+)", url.strip().lower())
        if not m:
            return ""
        host = m.group(1)
        if host.startswith("www."):
            host = host[4:]
        return host

    @gl.public.write
    def verify(self, url: str) -> None:
        host = self._host_of(url)
        trusted = json.loads(self.trusted_json)
        self.last_status = "TRUSTED" if trusted.get(host, False) else "UNTRUSTED"

    @gl.public.write
    def add_domain(self, domain: str) -> None:
        self._require_owner()
        if not re.match(r"^[a-z0-9.-]+\.[a-z]{2,}$", domain):
            raise ValueError("invalid domain")
        trusted = json.loads(self.trusted_json)
        trusted[domain] = True
        self.trusted_json = json.dumps(trusted)

    @gl.public.write
    def remove_domain(self, domain: str) -> None:
        self._require_owner()
        trusted = json.loads(self.trusted_json)
        trusted[domain] = False
        self.trusted_json = json.dumps(trusted)

    @gl.public.write
    def propose_domain(self, domain: str) -> None:
        if not re.match(r"^[a-z0-9.-]+\.[a-z]{2,}$", domain):
            raise ValueError("invalid domain")
        proposals = json.loads(self.proposals_json)
        voters = proposals.get(domain, [])
        sender = str(gl.message.sender_address)
        if sender in voters:
            raise Exception("already voted")
        voters.append(sender)
        proposals[domain] = voters
        self.proposals_json = json.dumps(proposals)
        if len(voters) >= GOVERNANCE_THRESHOLD:
            trusted = json.loads(self.trusted_json)
            trusted[domain] = True
            self.trusted_json = json.dumps(trusted)
            del proposals[domain]
            self.proposals_json = json.dumps(proposals)

    @gl.public.view
    def get_last_status(self) -> str:
        return self.last_status

    @gl.public.view
    def get_trusted(self) -> str:
        return self.trusted_json

    @gl.public.view
    def get_proposals(self) -> str:
        return self.proposals_json
