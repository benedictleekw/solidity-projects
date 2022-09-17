# DAO Project

## About
A governance smart contract for a decentralized autonomous organization (DAO) with the purpose of buying NFTs with treasury funds. Members can submit proposals to purchase NFTs or execute arbitrary code. Votes can be made either on-chain or off-chain with EIP-712 signature. 

## Technical Spec
### Proposal System Spec

- Any member can create a proposal.
- There can be only 1 active proposal per individual member.
- 25% quorum (minimum participation rate, accounting both yes and no votes). This is fixed for all proposal.
- Any proposal that didn’t hit the 25% quorum will consider failed.
- Proposal are not cancelable.
- For a proposal to pass,
    - The amount of “Yes” votes need to be more than “No” votes.
    - Must have 25% quorum (total votes / total member at the time of proposal creation * 100)
- After a proposal passed, the proposal will be update to a “success” state. And any members of the DAO can call the `execute()` function to run the proposal.
- Proposal can be execute as many times as needed until it is executed. (Only once it can be succeed) 

### Voting System Spec

- Contribute 1 eth to be a DAO member.
- Any dao member can vote, 1 vote per address.
- 1 address can only own 1 membership.
- If someone tried to contribute more than 1 eth, the transaction will be reverted.
- DAO membership buy-in will be open forever.
- Voting starts as soon as a proposal is created with a 13 mins delay; member can start vote after 1 block.
- Voting are open for 1 week (25200 seconds)
- Casted votes cannot be change.
- The options of votes are “Yes” and “No”.
- There will be no snapshot. However, when a new member join the DAO, a block.timestamp is recorded and the member cannot participate/vote in any active proposal before the timestamp

## Design Exercise Answer
> Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

To add delegation vote, I think the main implementation logic is (1)to keep track how many votes has been delegated to a member (as multiple member can delegate to one member), (2)votes that had been delegated are not allow to vote (or else we will be double counting votes).

```solidity
mapping (address => uint256) public delegatedVotes;
mapping (address => bool) public delegatorAddress;
```
When a delegate is called, we will increment the count for the person that the vote has been delegated to. This way we can keep track how many votes the member can cast.
At the same time, we need to make sure the delegator cannot vote (since they give their voting rights away)
```solidity
function _delegate(address delegator, address delegatee) internal {
        //check to make sure delegator and delegatee is a member
        delegatorAddress[delegator] = true;
        delegatedVotes[delegatee]++;
    }
```


> What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

Since the votes are delegation transitively which make it difficult to keep track on the delegated votes since they are chained together. As provided in the example, in order to get the voting power/count of C, we will need to know how much voting power B has, and to know that, we need to go one level higher to know how much voting power A has. As the chain get longer, we will go down a rabbit hole which is not not wise espeically on chain.

## Unfinised feature
1) Did not get enough time to finish the feature to do bulk voting using offchain signatures.
The idea is to pass in an array of signatures and have a loop to verify each signature is valid (a member votes) and cast those votes by calling `_votes()`


## Useful Commands

Try running some of the following commands:

```shell
npx hardhat help
npx hardhat compile              # compile your contracts
npx hardhat test                 # run your tests
npm run test                     # watch for test file changes and automatically run tests
npx hardhat coverage             # generate a test coverage report at coverage/index.html
REPORT_GAS=true npx hardhat test # run your tests and output gas usage metrics
npx hardhat node                 # spin up a fresh in-memory instance of the Ethereum blockchain
npx prettier '**/*.{json,sol,md}' --write # format your Solidity and TS files
```
