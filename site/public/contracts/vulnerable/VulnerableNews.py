# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *

# Module 8 (Vulnerable) -- URL spoofing / immutable allow-list.
# The trusted-domain set is hardcoded in code. If a domain in the list is
# compromised (DNS hijack, ownership change), or if a new legitimate
# source is needed, the contract has no way to react -- it must be
# entirely redeployed. There is also no `add_domain` method, so attempts
# to react on-chain end with FINISHED_WITH_ERROR ("function not found").

TRUSTED_DOMAINS = ("reuters.com", "bbc.com", "apnews.com")


class VulnerableNews(gl.Contract):
    last_status: str

    def __init__(self):
        self.last_status = ""

    @gl.public.write
    def verify(self, url: str) -> None:
        # Naive host extraction. Also part of the bug: a URL like
        # https://reuters.com.attacker.example/... slips through.
        host = ""
        try:
            host = url.split("/")[2].lower()
            if host.startswith("www."):
                host = host[4:]
        except Exception:
            host = ""

        if host in TRUSTED_DOMAINS:
            self.last_status = "TRUSTED"
        else:
            self.last_status = "UNTRUSTED"

    @gl.public.view
    def get_last_status(self) -> str:
        return self.last_status
