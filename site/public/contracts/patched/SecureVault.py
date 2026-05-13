# { "Depends": "py-genlayer:15qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0" }

from genlayer import *
import json

# Module 5 (Patched) -- Role-based access control.
# Owner is set in the constructor from the deployer's address; only the
# owner can grant/revoke minter rights; only minters can mint.


class SecureVault(gl.Contract):
    owner: str
    minters_json: str       # {"0xabc...": true, ...}
    balances_json: str
    total_supply: str

    def __init__(self):
        deployer = str(gl.message.sender_address)
        self.owner = deployer
        self.minters_json = json.dumps({deployer: True})
        self.balances_json = "{}"
        self.total_supply = "0"

    def _require_owner(self) -> None:
        if str(gl.message.sender_address) != self.owner:
            raise Exception("only owner")

    def _require_minter(self) -> None:
        minters = json.loads(self.minters_json)
        if not minters.get(str(gl.message.sender_address), False):
            raise Exception("only minter")

    @gl.public.write
    def add_minter(self, addr: str) -> None:
        self._require_owner()
        minters = json.loads(self.minters_json)
        minters[addr] = True
        self.minters_json = json.dumps(minters)

    @gl.public.write
    def remove_minter(self, addr: str) -> None:
        self._require_owner()
        minters = json.loads(self.minters_json)
        minters[addr] = False
        self.minters_json = json.dumps(minters)

    @gl.public.write
    def mint(self, amount: int) -> None:
        self._require_minter()
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
    def is_minter(self, addr: str) -> str:
        minters = json.loads(self.minters_json)
        return "true" if minters.get(addr, False) else "false"

    @gl.public.view
    def get_total_supply(self) -> str:
        return self.total_supply
