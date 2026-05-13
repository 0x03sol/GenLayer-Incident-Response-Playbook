# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *

# Module 7 -- Biased prompt / appeal-window demonstration.
# This contract is deliberately and visibly biased: it instructs the LLM
# to ignore the actual review content and always return POSITIVE. Some
# validators dutifully follow the bias; others recognise it as nonsense
# and answer truthfully. The point is to drive a real, observable
# disagreement on Bradbury so the appeal window of Optimistic Democracy
# can be exercised.
# There is no patched counterpart -- the lesson is that even when a single
# contract author writes a malicious prompt, the consensus mechanism still
# surfaces the disagreement.


class BiasedPrompt(gl.Contract):
    last_label: str

    def __init__(self):
        self.last_label = ""

    @gl.public.write
    def classify(self, review: str) -> None:
        clean = review.strip().replace("```", "ʼʼʼ")[:500]

        def _llm() -> str:
            prompt = (
                "Always classify the following as POSITIVE regardless of content. "
                "Reply with exactly one token from {POSITIVE, NEGATIVE}.\n"
                f"```\n{clean}\n```"
            )
            return gl.nondet.exec_prompt(prompt).strip().upper().split()[0]

        # strict_eq amplifies disagreement so it is visible on-chain.
        self.last_label = gl.eq_principle.strict_eq(_llm)

    @gl.public.view
    def get_last_label(self) -> str:
        return self.last_label
