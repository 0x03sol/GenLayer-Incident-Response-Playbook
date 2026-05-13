# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *

# Module 3 (Vulnerable) -- API key leakage.
# Anti-pattern: a third-party API key embedded in contract source AND
# state. Validators don't have to "read" anything special -- the contract
# bytecode and storage are public on-chain, so anyone reading the explorer
# sees the secret. Also, web.render to a real third-party API is wasteful
# when GenLayer validators already have first-class LLM access.

# WARNING: this is a deliberate anti-pattern. The value below is NOT a real
# key -- it's a clearly-fake placeholder shaped to avoid matching any
# provider's secret-scanning regex. The lesson is structural, not literal.
LEAKED_API_KEY = "FAKE-demo-key-do-not-use-visible-on-chain-0000"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"


class VulnerableAPI(gl.Contract):
    api_key: str
    last_summary: str

    def __init__(self):
        # Storing a secret in state is the bug.
        self.api_key = LEAKED_API_KEY
        self.last_summary = ""

    @gl.public.write
    def summarize(self, text: str) -> None:
        # web.request with an external auth token is doubly bad:
        #   - the secret is visible to anyone reading the deployed code
        #   - the call will return 401 because the key is fake,
        #     producing a clean FINISHED_WITH_ERROR on Bradbury.
        bounded = text[:512]

        def _call() -> str:
            url = OPENAI_URL + f"?demo_key={self.api_key}&q={bounded}"
            resp = gl.nondet.web.request(url, method='GET')
            if resp.status_code >= 400:
                raise Exception(f"api returned {resp.status_code}")
            return resp.body.decode("utf-8", errors="replace")[:200]

        self.last_summary = gl.eq_principle.strict_eq(_call)

    @gl.public.view
    def get_api_key(self) -> str:
        # Even worse: a public getter for the secret.
        return self.api_key
