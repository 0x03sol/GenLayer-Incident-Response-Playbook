# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *

# Module 2 (Vulnerable) -- Prompt injection.
# Raw user input is concatenated directly into the LLM prompt and the
# result is wrapped in strict_eq. Strict equivalence on free-form LLM
# output is brittle on its own; layered with prompt injection, validators
# diverge as different models latch onto different parts of the hostile
# instruction. Result: FINISHED_WITH_ERROR on the consensus round.


class VulnerableChat(gl.Contract):
    last_label: str

    def __init__(self):
        self.last_label = ""

    @gl.public.write
    def classify(self, user_message: str) -> None:
        def _llm() -> str:
            prompt = (
                "Classify the sentiment of the following message. "
                "Reply with exactly one word: POSITIVE, NEGATIVE, or NEUTRAL.\n\n"
                f"Message: {user_message}"
            )
            return gl.nondet.exec_prompt(prompt)

        # strict_eq on free-form LLM text is the bug. With a benign input
        # different validators may still produce different casing/spacing;
        # with an injected input, semantic divergence is near-certain.
        self.last_label = gl.eq_principle.strict_eq(_llm)

    @gl.public.view
    def get_last_label(self) -> str:
        return self.last_label
