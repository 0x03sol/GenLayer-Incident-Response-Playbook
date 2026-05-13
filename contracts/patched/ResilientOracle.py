# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *
import json

# Module 1 (Patched) -- Resilient oracle.
# Mutable allow-list of endpoints. Tries each in order; first success wins.
# Owner can add/remove endpoints without redeploying.

DEFAULT_ENDPOINTS = [
    # Intentionally-broken endpoint to prove fallback works.
    "https://oracle-rot-demo.invalid/eth.json",
    # GenLayer-hosted static fixture; returns the same body on every
    # validator so strict_eq converges.
    "https://test-server.genlayer.com/static/genvm/hello.html",
]

# A substring guaranteed to appear in the static fixture's body.
STABLE_MARKER = "Hello"


class ResilientOracle(gl.Contract):
    owner: str
    endpoints_json: str
    last_value: str

    def __init__(self):
        self.owner = str(gl.message.sender_address)
        self.endpoints_json = json.dumps(DEFAULT_ENDPOINTS)
        self.last_value = ""

    def _require_owner(self) -> None:
        if str(gl.message.sender_address) != self.owner:
            raise Exception("only owner")

    @gl.public.write
    def fetch_value(self) -> None:
        endpoints = json.loads(self.endpoints_json)

        def _fetch() -> str:
            for url in endpoints:
                try:
                    resp = gl.nondet.web.request(url, method='GET')
                    if 200 <= resp.status_code < 300:
                        body = resp.body.decode("utf-8", errors="replace")
                        if STABLE_MARKER in body:
                            return f"OK:{url}:{STABLE_MARKER}"
                except Exception:
                    continue
            raise Exception("all endpoints failed")

        self.last_value = gl.eq_principle.strict_eq(_fetch)

    @gl.public.write
    def add_endpoint(self, url: str) -> None:
        self._require_owner()
        if not url.startswith("https://"):
            raise ValueError("https only")
        endpoints = json.loads(self.endpoints_json)
        if url not in endpoints:
            endpoints.append(url)
            self.endpoints_json = json.dumps(endpoints)

    @gl.public.write
    def remove_endpoint(self, url: str) -> None:
        self._require_owner()
        endpoints = json.loads(self.endpoints_json)
        endpoints = [u for u in endpoints if u != url]
        self.endpoints_json = json.dumps(endpoints)

    @gl.public.view
    def get_last_value(self) -> str:
        return self.last_value

    @gl.public.view
    def get_endpoints(self) -> str:
        return self.endpoints_json
