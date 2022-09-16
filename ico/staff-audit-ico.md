https://github.com/0xMacro/student.benedictleekw/tree/f2a52fdb05fa4c91a310b437f024fc9daabf7d6e/ico

Audited By: Gary

# General Comments

Good job on this project.  However, you did have a vulnerability of exceeding the seed phase total limit.  You had a test case where the total contribution up to the point was 15,000 and the next contribution failed. However, if you added a test case where the new contribution would put the seed total over the limit, you would have caught this issue.  You need to really think about all your test cases based on your requirements and make sure you include it in the testing. 

In addition, there were two test failures in the test script.  You were trying to loop 30 signer addresses, but it only returned 16.  Thus failure on the test.  You should not submit project for audit with test errors. 

```
  1) ICO
       ICO Contract
         Contributions and claims
           General Phase
             Should block contribute when seed total contribution has met:
     AssertionError: Expected transaction to be reverted with reason 'ICO: fund goal has reached', but it 
     didn't revert
  

  2) ICO
       ICO Contract
         Contributions and claims
           Open Phase
             Should block contribute when seed total contribution limit has met:
     AssertionError: Expected transaction to be reverted with reason 'ICO: fund goal has reached', but it 
     didn't revert
```

Front-end looks good!

Please review my suggestions on code quality and ensure that you address these issues in your next project.

# Design Exercise

A Timelock contract is a good approach because then you don't need to write that code yourself, and it does 
One Thing Right. Though I expected more detail on exactly how that would work; pseudocode snippets are always 
appreciated!

# Issues

**[L-1]** Can exceed Seed Phase total Limit

`contribute` does not have a check to ensure that the contribution being made will put the total contributions 
for the contract over the seed limit of 15_000 ether.  

It only checks the total amount from the previous contribution. It needs to add in the current contribution 
being made. 

Consider changing line 64-67 from
```
   require(
       fundsRaised <= SEED_PHASE_TOTAL_LIMIT,
       "ICO: Seed phase total contribution limit exceeded"
   );
```

to

```
   require(
       fundsRaised + msg.value <= SEED_PHASE_TOTAL_LIMIT,
       "ICO: Seed phase total contribution limit exceeded"
   );
```

**[L-1]** Dangerous Phase Transitions

If the 'updatePhase' function is called twice, a phase can accidentally 
be skipped. There are a few situations where this might occur:

1. Front-end client code malfunction calling the function twice.
2. Human error double-clicking a button on the interface on accident.
3. Repeat invocations with intent - Uncertainty around whether or not a 
transaction went through, or having a delay before a transaction processes, 
are common occurrences on Ethereum today.

Consider refactoring this function by adding an input parameter that 
specifies either the expected current phase, or the expected phase to 
transition to.

**[Missing Feature 1]** The source code for the SpaceCoin contract is not verified on Etherscan

[Q-1] Unchanged variables should be marked constant or immutable

Your contract includes storage variables that are not updated by any functions and do not change. For these 
cases, you can save gas and improve readability by marking these variables as either constant or immutable.

What's the difference? In both cases, the variables cannot be modified after the contract has been constructed.
For constant variables, the value has to be fixed at compile-time, while for immutable, it can still be assigned
at construction time.

Compared to regular state variables, the gas costs of constant and immutable variables are much lower. For a 
constant variable, the expression assigned to it is copied to all the places where it is accessed and also 
re-evaluated each time. This allows for local optimizations. Immutable variables are evaluated once at 
construction time and their value is copied to all the places in the code where they are accessed. For these 
values, 32 bytes are reserved, even if they would fit in fewer bytes. Due to this, constant values can sometimes
 be cheaper than immutable values.

There are a number of variables set in the SpaceCoin.sol and ICO.sol constructor that don't change. Consider 
marking unchanged storage variables after being updated in the constructor as immutable, like this:

SpaceCoin
  address public immutable creatorAddress;
  address public immutable treasuryAddress;

ICO
  address public immutable owner;
  SpaceCoin public immutable token;
  address public immutable tokenAddress;

Reference: https://docs.soliditylang.org/en/v0.8.9/contracts.html#constant-and-immutable-state-variables

[Q-2] Unnecessary initialization of storage variables

This is not needed (and wastes gas) because every variable type has a default value it gets set to upon 
declaration.

For example:

```
address a;  // will be initialized to the 0 address (address(0))
uint256 b;  // will be initialized to 0
bool c;     // will be initialized to false
```

Consider not setting initial values for storage variables that would otherwise be equal to their default 
values, as you did here:
```
// Line 13 in `SpaceCoin.sol`
bool public taxEnabled = false;
```

```
// Line 27  in `ICO.sol`
Phase public phase = Phase.Seed;       // Phase.Seed equates to 0, which the phase would default to anyways   
```

**[Q-3]**  Event attributes not indexed

For easier off chain tracking and monitoring define indexable attributes.

You can add the attribute 'indexed' to up to three parameters which adds them to a special data structure known
 as “topics” instead of the data part of the log.

Topics allow you to search for events, for example when filtering a sequence of blocks for certain events. 
You can also filter events by the address of the contract that emitted the event.
see: https://docs.soliditylang.org/en/develop/contracts.html#events->

**[Q-4]** Additional events should be emitted

It would be important to emit an event when the contract goes on pause and also when the phases are advanced 
in order for others to be informed. They would need to know if the contract is paused, and what the contract
 limits are. 

In addition, when a contribution is made in the Open phase an event should also be emitted - not just 
contributions in the Seed or General phases. 

**[Q-5]** Public vs. external functions

If a function is never called from inside your contract, but is designed to be called externally, it is best 
practice to mark its visibility `external` instead of `public`. This helps with gas savings on initial contract
deployment.

Consider changing the relevant functions visibility to `external` from `public`. 

In `SpaceCoin.sol` - enabledTax()  -  
In `ICO.sol` - all functions should be external 

**[Q-6]** Unnecessary copying of calldata values to memory

The function `addAllowlistAddress` takes an array of addresses declared as `memory`. As a result, these arrays
will be copied into memory from calldata. If they were declared as `calldata`, and the functions themselves 
declared `external` rather than `public`, then this copying could be avoided.

**[Q-7]** Unnecessary memory storage

In `ICO.sol` and function `addAllowlistAddress` line 119 is unnecessary and creates gas. The following
```
            address adr = addresses[i];
            allowlistAddress[adr] = true;
```

Can be modified to be only
```
            allowlistAddress[addresses[i]] = true;
```

**[Q-8]** Unused variable  - tokenAddress

Unused storage variables needlessly increase the cost of
deployment, and confuse readers of the contract. Please remove them if
they are not used.

# Nitpicks

- The remainingLimit value in the Contribute event has no reference to what phase it belongs to.  Is it the 
  remaining limit for the SEED, General, or Open phase? 

- Optimize your code to reduce byte code and deployment cost by setting optimizer in the hardhat config file. 
- Melville stressed this in class. Refer to: https://hardhat.org/config

Adding this to the hardhat config under solidity will save in gas:
```
settings: {
    optimizer: {
      enabled: true,
      runs: 200
```


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | 1 |
| Extra features             | - |
| Vulnerability              | 2 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total: 3

 Great job!