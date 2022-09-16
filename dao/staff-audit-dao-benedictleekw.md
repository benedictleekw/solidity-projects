https://github.com/0xMacro/student.benedictleekw/tree/bac3bf15134057b997da28b5e8cc55605287cea1/dao

Audited By: Paul Czajka

# General Comments

Good work on the corrections! The vulnerability fixes, unfinished feature, and insufficient `voteSig` tests were all well addressed. I think there are still minor gaps in testing, but not to the level of scoring against it. In particular there is no verification of the newly added error on the nft price check pre-purchase. Also, there's no explicit tests that an NFT was in fact bought.

One of your fixes resulted in a new Gas Optimization issue: see **[G-1]** below. Un-address original Gas/Quality items were not re-copied here.


## **[G-1]** Eliminate unnecessary operations when executing an NFT purchase at inappropriate time

For the fix to the original Q-4 issue (Duplicate NFT buying code), you could have gone a slightly different way which would also be a gas optimization/usability improvement. You could have had `buildBuyNFTParamHash()` build calldata to call your `executeBuyNFT()` function rather than the `nftMarketplace.buy()` function directly. Doing this ensures that all proposal executions go through `execute()` and benefit from the proposal-validation _first_. As it is now, having users call `executeBuyNFT()` directly incurs costs of price-checking against the nft marketplace even if the proposal is not in an executable state.


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | - |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total: 0

Great job!

