# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *

# Module 6 (Vulnerable) -- Anti-bot wall.
# The contract accepts any URL from the caller and pulls it through
# nondet.web.render. If the target is fronted by an anti-bot service,
# different validators see different challenge pages (rotating tokens,
# rate-limit messages, captcha HTML), so strict_eq cannot agree.


class VulnerableCrawler(gl.Contract):
    last_excerpt: str

    def __init__(self):
        self.last_excerpt = ""

    @gl.public.write
    def crawl(self, url: str) -> None:
        def _fetch() -> str:
            return gl.nondet.web.render(url, mode="text")[:400]

        # strict_eq + an unconstrained URL == fragile.
        self.last_excerpt = gl.eq_principle.strict_eq(_fetch)

    @gl.public.view
    def get_last_excerpt(self) -> str:
        return self.last_excerpt
