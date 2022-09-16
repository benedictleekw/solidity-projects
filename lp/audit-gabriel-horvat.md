## August 17 - LP Micro-Audit

Reviewed by Gabriel Horvat

Repo:
https://github.com/0xMacro/student.benedictleekw/tree/e13d41e84e488aed0741032e2002947a7b45a0cd

---

#### [H-1] No reentrancy protection for swapExactTokensForETH(), addLiquidity()

**line 68 swapExactTokensForETH()**

We don't know who msg.sender is. Could be a malicious contract that's calling our function over and over.

Strongly consider adding reentrancy protection, for example using a "lock" boolean.

**lines 20,24 addLiquidity()**

Same here. See above.

---

### [Q-1] Missing feature: You're not charging the 1% fee anywhere

If this was a production environment, then your Uniswap dApp wouldn't actually make any money from offering swaps.

### [Q-1] treasury variable unused

---

Line 11: SpaceLP.sol

You initialize it but never end up using it.
