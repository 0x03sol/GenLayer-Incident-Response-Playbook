# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *
import json

# Module 4 (Patched) -- Tolerant equivalence.
# Same upstream feed, but the consensus principle is comparative: each
# validator returns a price; agreement is judged by an LLM-mediated check
# that the values are within a sane spread. This is the correct shape of
# eq_principle for live, slowly-drifting data.

PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
TOLERANCE_PERCENT = 2.0


class TolerantPrice(gl.Contract):
    last_price: str
    tolerance_percent: str  # stored as string for cross-validator stability

    owner: str

    def __init__(self):
        self.owner = str(gl.message.sender_address)
        self.last_price = ""
        self.tolerance_percent = str(TOLERANCE_PERCENT)

    @gl.public.write
    def fetch_eth(self) -> None:
        tol = self.tolerance_percent

        def _fetch() -> str:
            resp = gl.nondet.web.request(PRICE_URL, method='GET')
            data = json.loads(resp.body.decode("utf-8"))
            return str(data["ethereum"]["usd"])

        principle = (
            f"All values must be numeric ETH/USD prices and be within {tol}% "
            "of each other. Pick any one of them."
        )
        self.last_price = gl.eq_principle.prompt_comparative(_fetch, principle=principle)

    @gl.public.write
    def set_tolerance(self, percent_str: str) -> None:
        """Owner can tune the equivalence tolerance on-chain -- deterministic,
        no LLM. Demonstrates that the comparative principle is parameterised,
        which is the structural fix relative to hardcoded strict_eq."""
        if str(gl.message.sender_address) != self.owner:
            raise Exception("only owner")
        self.tolerance_percent = percent_str

    @gl.public.view
    def get_tolerance(self) -> str:
        return self.tolerance_percent

    @gl.public.view
    def get_last_price(self) -> str:
        return self.last_price
