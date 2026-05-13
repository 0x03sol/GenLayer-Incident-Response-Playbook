# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *
import json

# Module 4 (Vulnerable) -- Wrong equivalence principle.
# Live ETH spot price changes between the moment each validator fetches
# CoinGecko. Wrapping the fetch in strict_eq REQUIRES byte-for-byte
# agreement. Validators land on slightly different float values --> the
# round fails to reach consensus and the tx ends FINISHED_WITH_ERROR.

PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"


class VulnerablePrice(gl.Contract):
    last_price: str

    def __init__(self):
        self.last_price = ""

    @gl.public.write
    def fetch_eth(self) -> None:
        def _fetch() -> str:
            resp = gl.nondet.web.request(PRICE_URL, method='GET')
            data = json.loads(resp.body.decode("utf-8"))
            return str(data["ethereum"]["usd"])

        # BUG: strict_eq on a continuously-changing float.
        self.last_price = gl.eq_principle.strict_eq(_fetch)

    @gl.public.view
    def get_last_price(self) -> str:
        return self.last_price
