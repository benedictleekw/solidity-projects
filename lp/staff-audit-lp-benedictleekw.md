https://github.com/0xMacro/student.benedictleekw/tree/bac3bf15134057b997da28b5e8cc55605287cea1/lp

Audited By: Paul Czajka

# General Comments

Good effort here! Of the original pointed issues, L-1 was a solid fix. For the SPC tax-related issues (Technical-Mistake-1 and 2): you introduced a bug and it breaks the entire LP project! Adding liquidity, removing liquidity, and swapping no longer work. After reviewing this issue and its impacts, staff has conferred and agreed the most appropriate scoring is to accept your discord-provided fix as a late submission. This is much more to your advantage than strictly scoring the project with the bug present. See **[Late]** below.

In the future, please don't comment out broken tests! These are valuable signal to everyone - including your future self. Imagine taking a long weekend and then you or a coworker accidentally ship something to Production that still has broken tests that you commented out and forgot. YIKES!!

I might go a step further and say, "Don't be afraid of broken tests". Having broken tests is an expected and normal part of the development process. But a secret super-power of tests is that they serve to unburden your cognitive load. This is especially true of broken tests. There are SO MANY concerns to remember and juggle, and tons of state to build up and store in our brains when we write code - for smart contracts in particular. Tests do a great job of capturing that state and those concerns and "remembering them" so you don't have to. It may be broken when you write it, but that's just serving as a pegged memory you can drop and then come back to later. Used wisely, they're a huge tool for efficiency, and can allow you to work faster and smarter.


## **[Late]** Project correction bugfix

Your identified solution to fix the broken `getSpcAmountTaxed()` Router function is accepted, and counted as a late submission:

```solidity
 spcAmountAfterTax = spaceCoin.taxEnabled() ? spcAmount * 98 / 100 : spcAmount;
```


## **[Unfinished-Feature-1]** Unchanged from original submission

Front-end remains unfinished


## **[Insufficient-tests]** Unchanged from original submission

Swap-tests remain insufficient




# Score

| Reason | Score |
|-|-|
| Late                       | 3 |
| Unfinished features        | 1 |
| Extra features             | - |
| Vulnerability              | - |
| Unanswered design exercise | - |
| Insufficient tests         | 1 |
| Technical mistake          | - |

Total: 5

Good job!

