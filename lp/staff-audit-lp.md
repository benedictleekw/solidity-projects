https://github.com/0xMacro/student.benedictleekw/tree/e13d41e84e488aed0741032e2002947a7b45a0cd/lp

Audited By: Paul Czajka

# General Comments

Good effort on a tough project! Check SpaceLP.sol line 67: I suspect you might have an extra multiplicand of 1000 on the right hand.  Uniswap does the logic slightly differently than yours, which might be the source of the error. This bug hurt a little, because it prevented you from buttoning up the focal feature of the pool. Specifically, 1pt for unfinished front-end and 1pt for unfinished swap tests.

Otherwise the major plumbing appears to all be in place, with respect to interaction between the Pool and Router. Additional areas for improvement centered around token transfer tax accounting and proper handling of edge-case inputs. The transfer tax concern has a number of implications, which you can read about in the issues below. The edge-cases that got you were `0`-valued inputs. Considering unexpected inputs is a great item to add to your checklist when reviewing your own code.

You made an interesting design decision with respect to adding the `receive()` function instead of making `mint()` or `swap()` payable. It's good that you didn't do both - that would have been a technical mistake. Your approach definitely _works_ as designed, but it _communicates_ a design that might mislead some users to try and just send ETH directly to the Pool, expecting a swap to happen. They'll just lose their ETH, to the delight of arbitrageurs. For this reason, it might be more beneficial to drop the `receive()` function and make `swap()` and `mint()` payable. This communicates more clearly how payments are to be accepted.  Although, this presents a similar problem because directly calling the Pool's `swap()` or `mint()` without the Router can have it's own unexpected effects.  This is a great reason to both select a clear, communicative design; as well as add comments to further enlighten users on the proper use of the API.


# Design Exercise

Good thinking on the staking approaches.  It looks like #2 is a generalization of #1? Specific to #1: is it desireable for liquidity providers to re-invest their SPC? If so, would you update your design to accomodate this?  #3 is interesting, but it's a bit unclear what a "tier system" actually means in terms of contract design. Without further detail, it's not clear how #2 - with some enhancements - can't be leveraged for this purpose.


# Issues

## **[L-1]** Initial call to add liquidity can yield invalid pool state

The first call to `addLiquidity()` can leave the pool in an invalid state if called with `0` values for ETH or SPC. See `_getOptimalPairAmount()` lines 33-36:

```solidity
        (uint ethReserve, uint spcReserve) = spaceLP.getReserves();
        if (ethReserve == 0 && spcReserve == 0) {
            ethAmount = ethAmountDesired;
            spcAmount = spcAmountDesired;
```

This logic will directly send `msg.value` ETH and `spcAmountDesired` SPC to `SpaceLP.sol`, then call `mint()`. The logic of `mint()` will accept the transfers and mint 0 LP tokens in return. See SpaceLP.sol:mint() lines 37-38:

```solidity
        if (_totalSupply == 0) {
            lpAmount = sqrt(ethAmount * spcAmount);
```

If either `ethAmount` or `spcAmount` are `0`, `lpAmount` will yield `0`. This then leaves the pool in a state where it now has either ETH reserves or SPC reserves (depending which one was non-zero), but 0 LP token supply. As a result, the liquidity-provider has lost their ETH or SPC, and subsequent `addLiquidity()` calls may fail within `_getOptimalPairAmount()` when the divisor is zero:

```solidity
        } else {
		    // This line REVERTS if ethReserve=0
            uint spcAmountOptimal = ethAmount * spcReserve / ethReserve;
            if (spcAmountOptimal <= spcAmountDesired) {
                ethAmount = ethAmountDesired;
                spcAmount = spcAmountOptimal;
            } else {
			    // This line REVERTS if spcReserve=0
                uint ethAmountOptimal = spcAmount * ethReserve / spcReserve;
                ethAmount = ethAmountOptimal;
                spcAmount = spcAmountDesired;
            }
        }
```

The pool can be made fully-functional again by sending a non-zero amount of the missing asset directly to SpaceLP and calling `mint()`.

Consider adding logic within `mint()` to require a non-zero LP token value is generated. This will ensure the pool is always created with non-zero values of both ETH and SPC.



## **[Technical Mistake-1]** Add Liquidity does not account for transfer tax

The optimal pair amount calculation does not account for SPC transfer tax. When on, this results in less SPC being received by the Pool than was calculated as ideal. The results in less LP tokens, and effectively donates extra ETH to the pool.  

For example, assume the following state of the pool:
ETH: 100
SPC: 500
totalSupply = 1000

User calls `addLiquidity` with 50 ETH and 250 SPC.

`_getOptimalPairAmount` will check the 50 ETH and 250 SPC, see that it's in a 1:5 ratio, see that this ratio is the same as the 1:5 ratio of the pool's reserves (i.e. 100 ETH and 500 SPC), and then transfer 50 ETH and 250 SPC to the pool.

However, because of the 2% SPC transfer tax, only 245 SPC makes it to the pool. And, crucially, because the pool takes the `Math.min(ethAmount * _totalSupply / ethReserves, spcAmount * _)totalSupply / _spcReserve)`, it will calculate `245 * 1000 / 500 = 490` is less than `50 * 1000 / 100 = 500`, and only mint `490` LP tokens. `490` LP tokens is the same they would have received if `ethAmountIn = 49` and `spcAmountIn = 245`, so that `50 - 49 = 1` ETH is effectively taken from the user and donated to the pool.

Consider checking for the tax and subtracting away 2% from the SPC the pool will receive when calculating the correct amount of SPC and ETH in `_getOptimalPairAmount`.


## **[Technical Mistake-2]** Router’s swap function does not account for feeOnTransfer tokens such as SPC

When SPC transfer tax is on, the value returned by `_calAmountOut()` will not include the 2% transfer tax. As a result, the SPC received by the Pool (for SPC-to-ETH swap) or received by the user (for ETH-to-SPC swap) will be less than expected. This creates the possibility that the minimum ETH or SPC received could be lower than the supplied miniumum threshold.


## **[Unfinished-Feature-1]**

Front-end is unfinished


## **[Insufficient-tests]**

Swap-tests are unfinished

## **[Q-1]** Misleading revert message in `ICO:withdraw()`

The revert message on ICO.sol:141 begins with `SpaceRouter: `. This should be `ICO: ` to prevent any confusion of where the error originated.


## **[Q-2]** Duplicate `sqrt` code in SpaceLP

Math.sol is imported, and the `sqrt` function is defined within SpaceLP. Consider removing the re-definition.


## **[Q-3]** No use of indexed parameters in events

Indexing parameters in events are a great way to keep track of specific outputs from events, allows the creation of topics to sort and track data from them. For example, a dapp can readily display all LP activity for the logged in user if address arguments are indexed:

```solidity
    event TokenMint(address indexed mintAddress, uint256 lpAmount);
    event SwapToken(uint amountIn, uint amountOut, address indexed to);
    event BurnToken(uint ethAmount, uint spcAmount, address indexed to);
```

Consider adding indexes where it could serve as beneficial.


## **[Q-4]** Checks-Effects-Interactions pattern is not followed

In your `swap` function in `SpaceLP`, there are external calls (ie "interactions") that are made before updating contract state. In particular, on line 59, you `payable(to).call{value: ethAmountOut}("");` which can trigger a `receive` function on the recipient who can then re-enter your `swap` function. When external calls are involved, you should always be careful about re-entrancy risk. In this case, you could have addressed the issue by following the checks-effects-interactions pattern and making updates (ie "effects") to contract state before the external call. Alternatively, you could add a `nonReentrant` style modifier to the function. 

There doesn't seem to be any possible attack vector in this contract as a result of to the re-entrancy risk, so I'm marking this as a code quality issue rather than a vulnerability, but make sure to keep an eye out for external calls and re-entrancy risks.


# Nitpicks

* ICO.sol: `msg.sender` (line 46) and `treasuryAddress` (line 140) are already address types - no need to re-cast as address again.
* SpaceLP.sol Line 111: `_spac` should be `_spc`


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | 1 |
| Extra features             | - |
| Vulnerability              | 1 |
| Unanswered design exercise | - |
| Insufficient tests         | 1 |
| Technical mistake          | 3 |

Total: 6

Good effort!

