# Peer Micro Audit

author: @chilldude

## **[Q-1]** Unchanged variables should be marked constant or immutable

ICO.sol has three variables that are not updated outside the constructor. Gas could be saved and readability improved if those would be marked as immutable.

```solidity
    address public owner;
    SpaceCoin public token;
    address public tokenAddress;
```

Consider declaring owner, token and tokenAddress as immutable.

## **[Q-2]** Investors can contribute over the SEED_PHASE_TOTAL_LIMIT

The check here does not take into account of `msg.value`. That means it is possible to contribute over the `SEED_PHASE_TOTAL_LIMIT`
```solidity
            require(
                fundsRaised <= SEED_PHASE_TOTAL_LIMIT,
                "ICO: Seed phase total contribution limit exceeded"
            );
```

If this is intended behavior, document it in the code. Otherwise, consider changing the require check to `fundsRaised + msg.value <= SEED_PHASE_TOTAL_LIMIT`. The existing test case to check for seed total contribution limit does not test for this edge case since the loop leads to an exact total contribution of 15,000 ETH.
