# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *

# Module 1 (Vulnerable) -- URL Rot.
# Hardcoded single endpoint on a reserved-invalid TLD. DNS resolution will
# fail on every validator, producing a deterministic FINISHED_WITH_ERROR
# execution receipt. The point isn't that the URL is invalid -- it's that
# there is no fallback path, so any change to a real endpoint (downtime,
# anti-bot, schema change) bricks the contract forever.

PRICE_URL = "https://oracle-rot-demo.invalid/eth.json"


class VulnerableOracle(gl.Contract):
    last_value: str

    def __init__(self):
        self.last_value = ""

    @gl.public.write
    def fetch_price(self) -> None:
        def _fetch() -> str:
            resp = gl.nondet.web.request(PRICE_URL, method='GET')
            # No schema validation, no fallback, no error handling: if the
            # call raises (DNS, 5xx), the tx goes FINISHED_WITH_ERROR.
            return resp.body.decode("utf-8", errors="replace").strip()

        self.last_value = gl.eq_principle.strict_eq(_fetch)

    @gl.public.view
    def get_last_value(self) -> str:
        return self.last_value
