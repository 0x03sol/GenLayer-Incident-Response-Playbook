# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *

# Module 3 (Patched) -- Safe summarisation.
# No third-party API, no secret. Validators run the LLM themselves via
# gl.nondet.exec_prompt and reach consensus through prompt_comparative.
# If you genuinely need a private API, the right pattern is an off-chain
# proxy that signs/authenticates separately and is referenced by URL only.


class SafeAPI(gl.Contract):
    last_summary: str
    config_proof: str

    def __init__(self):
        self.last_summary = ""
        self.config_proof = ""

    @gl.public.write
    def summarize(self, text: str) -> None:
        # Bound input to keep prompts predictable across validators.
        bounded = text.strip().replace("```", "ʼʼʼ")[:1000]

        def _llm() -> str:
            prompt = (
                "Summarise the following text in one sentence (max 25 words). "
                "Output the summary only, no preface.\n"
                f"```\n{bounded}\n```"
            )
            return gl.nondet.exec_prompt(prompt).strip()

        self.last_summary = gl.eq_principle.prompt_comparative(
            _llm,
            principle="Summaries must convey the same key information.",
        )

    @gl.public.write
    def demonstrate_fix(self) -> None:
        """Deterministic proof that no third-party API key lives in this
        contract -- the set of storage fields does not include one."""
        self.config_proof = "NO_API_KEY_IN_STATE; validators run LLM directly"

    @gl.public.view
    def get_last_summary(self) -> str:
        return self.last_summary

    @gl.public.view
    def get_config_proof(self) -> str:
        return self.config_proof
