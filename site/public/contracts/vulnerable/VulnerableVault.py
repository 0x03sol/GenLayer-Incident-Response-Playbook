# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *
import json

# Module 5 (Vulnerable) -- Missing access control.
# `mint` is annotated @gl.public.write but performs no sender check.
# Any address on the network can mint tokens to themselves indefinitely.
# Deployment succeeds; the bug is observable at call-time.


class VulnerableVault(gl.Contract):
    balances_json: str
    total_supply: str

    def __init__(self):
        self.balances_json = "{}"
        self.total_supply = "0"

    @gl.public.write
    def mint(self, amount: int) -> None:
        # BUG: no auth.
        addr = str(gl.message.sender_address)
        balances = json.loads(self.balances_json)
        balances[addr] = int(balances.get(addr, 0)) + int(amount)
        self.balances_json = json.dumps(balances)
        self.total_supply = str(int(self.total_supply) + int(amount))

    @gl.public.view
    def balance_of(self, addr: str) -> str:
        balances = json.loads(self.balances_json)
        return str(int(balances.get(addr, 0)))

    @gl.public.view
    def get_total_supply(self) -> str:
        return self.total_supply
