https://github.com/0xMacro/student.benedictleekw/tree/6e64d3288f07555f23c6c90f2ef851208f1bbd0f/dao

Audited By: Rares Stanciu

# General Comments

Good work, Benedict!

Your project approched very correctly the governance patterns used for a DAO. The voting and proposal system designs are very simple an robust, and it definitely encourages me to join a DAO working like this. The code is well organized and easy to follow and understand.

There have been a few issues, described below, that I believe could've been easily identified by some additional unit tests, but I understand that the lack of time did not allow you to write extensive tests and finish the bulk voting function.

You have solid Solidity skills, and seems like you are on track! I am more than happy to help you manage to write more tests for your future projects, so hit me up on Discord if you ever encounter any blockers that will not allow you to finish on time. Don't waste more time than necessary, we're here to help 😃

Keep up the good work!

# Design Exercise

Your solution for vote delegation is correct and very good! You have also correctly explained the problems of transitive vote delegation. Good job!

# Issues

## **[H-1]** Non-members can vote using off-chain signatures

In `Governor.sol`, the function `voteSig` uses the `isMember` modifier, which only allows members to call it, but the function does not validate that the votes are coming from members. On lines 207-210, you are checking if the member has joined the DAO previous to the creation of the proposal:

```solidity
require(
    memberAddress[voterAddress] < _proposal.startTime,
    "Governor: New members are not allowed to vote on active proposal"
);
```

However, the default value of `memberAddress` for any non-member address is 0, which will pass the check, and allow the vote to happen.

In short, Alice (who is a member) can cast a vote for Bob (who is not a member). This allows a member (who pays only 1 ETH) to act as an infinite number of members, thus inflating the vote count artificially, without any costs.

Below is a failing test that demonstrates this behavior:

```ts
it("Can't vote with sig if not a member", async () => {
  const { governor, alice, bob, addrs } = await loadFixture(setupFixture);
  await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
  const txReceiptUnresolved = await governor
    .connect(alice)
    .createBuyNFTProposal(addrs[0].address, 123);
  const txReceipt = await txReceiptUnresolved.wait();
  const proposalId = txReceipt.events![0].args![0];
  await timeTravel(PROPOSAL_ACTIVE_DELAY);

  const domain = {
    chainId: 1,
    verifyingContract: governor.address,
  };
  const types = {
    Ballot: [
      { name: "proposalId", type: "uint256" },
      { name: "voteDecision", type: "uint8" },
    ],
  };
  const message = { proposalId: proposalId, voteDecision: YES };
  const signature = await bob._signTypedData(domain, types, message);
  const { v, r, s } = ethers.utils.splitSignature(signature);

  await expect(governor.connect(alice).voteSig(proposalId, YES, v, r, s)).to.be
    .reverted;
});
```

Consider checking that `memberAddress[voterAddress]` is also greater than 0, to ensure that the voting user is an actual member of the DAO.

---

## **[M-1]** NFT purchase price has no upper limit

When the DAO creates a proposal to purchase an NFT, the NFT seller could take advantage of that by raising the NFT price to some arbitrarily high amount.

Because the DAO calls `NftMarketplace.getPrice` but uses the result without checking if the price is reasonable, there is nothing stopping the DAO's funds from being drained by a malicious NFT seller.

Consider adding a `maxPrice` variable into the NFT-buying function that you then call in your `createBuyNFTProposal` function.

## **[L-1]** Proposal unable to execute due to NFT price changes

In `Governor.sol`, the function `executeBuyNFT` creates the three arrays needed to be passed to the `execute` function, which will be used in computing the proposal ID.

However, in this function, you are calling the NFT marketplace again for the price of that NFT. If the NFT prices has changed since the proposal was created, the `executeBuyNFT` function will lead to computing a different proposal ID (most probably inexistent) and unable to execute it. The only way left for executing the NFT buying proposal would be to call `execute` directly, passing in the correct arguments (primarily the correct NFT price at the time of the proposal creation).

Consider refactoring the code to use the same NFT price at execution, or refactor the code as per **[Q-4]** recommendations.

---

## **[Technical-Mistake-1]** Unable to propose the same function calls

For example, if your DAO needs to run a function (or a set of functions) regularly, the `Governor` contract would allow it to execute only once.

In `Governor.sol`, the `proposalId` is generated from hashing together the target addresses, values, and call data.

```solidity
uint256 proposalId = hashProposal(targetAddresses, values, calldatas);
```

This leads to generating the same ID for a proposal that calls the same functions with the same parameters, which will not be allowed by lines 108-110:

```solidity
require(
    proposals[proposalId].startTime == 0,
    "Governor: proposal already exist"
);
```

Consider adding additional data when computing the proposal ID hash to guarantee uniqueness (e.g., an incrementing field).

---

## **[Unfinished-Feature-1]** Bulk voting

---

## **[Insufficient-Tests-1]** Lack of `voteSig` tests

The lack of tests for the `voteSig` function allowed the **[H-1]** vulnerability to pass unnoticed.

Consider testing all possible execution paths of your smart contract, especially the major elements of the spec.

---

## **[Q-1]** DAO is locked in purchasing NFTs from a single marketplace.

In `Governor.sol, lines 50-52, we have:

```solidity
constructor(address _nftMarketplace) {
    nftMarketplace = _nftMarketplace;
}
```

Which sets the `nftMarketplaceAddress` in the constructor. However, there is no other way to change this variable. This extends a significant amount of trust and reliance on the given marketplace. The marketplace could know of this DAO and provide inflated prices for target NFTS. Or worse, the marketplace could cease to exist in the future, rending this part of the contract unusable.

Consider: adding a `NftMarketplace marketplace` parameter in the `createBuyNFTProposal()` function so that the contract can specify which market to purchase from.

## **[Q-2]** Redundant function call

In `Governor.sol`, lines 95-99, we have:

```solidity
uint256 proposalId = hashProposal(targetAddresses, values, calldatas);

createProposal(targetAddresses, values, calldatas);

return proposalId;
```

The `createProposal` function already makes the same call to `hashProposal`, in order to compute the proposal ID, and it returns it.

Consider removing the call to `hashProposal` in `createBuyNFTProposal` and use the return value of `createProposal` instead.

## **[Q-3]** Empty array items in `createBuyNFTProposal`

In `Governor.sol`, in the function `createBuyNFTProposal` you are creating the three required arrays for a proposal:

```solidity
address[] memory targetAddresses = new address[](2);
uint256[] memory values = new uint256[](2);
bytes[] memory calldatas = new bytes[](2);
```

However, the proposal for buying an NFT has only a single function call, so the arrays will be half-empty.

Consider refactoring the code to create arrays of only one item each. The same applies for `executeBuyNFT`.

## **[Q-4]** Duplicate NFT buying code

Functions `createBuyNFTProposal` and `executeBuyNFT` share 90% of the code, and this also leads to the **[L-1]** vulnerability.

Consider refactoring the code to have a single function, callable only by the DAO contract, that does the NFT buying operations, and make `createBuyNFTProposal` create proposals that call this new function. This way the code will be much cleaner and easier to debug, and will more easily allow you to implement the `maxPrice` parameter.

## **[Q-5]** Missing upper limit on the number of calls a proposal can make

The `createProposal` function does not enforce a maximum number of calls a proposal can have and thus allows the creation of proposals that could be barred from executing (due to gas limits).

Consider adding a limit on the number of calls a proposal can make.

## **[Q-6]** Missing array length validation

The `createProposal` function does not check if the `targetAddresses`, `values` and `calldatas` arrays have the same length. This allows the creation of proposals that will not be executable because the `execute` function will revert due to accessing invalid array indexes.

Consider checking that the arrays have the same length.

## **[Q-7]** Redundant proposal `totalVotes` field

It is cheaper to compute the `totalVotes` by summing `yesCount` and `noCount`, than to update the storage constantly.

Consider removing the `totalVotes` field from the `ProposalDetails` struct, and sum `yesCount` and `noCount` when needed.

## **[Q-8]** Proposal ID should be indexed

Events `ProposalCreated`, `VoteCasted` and `ProposalExecuted` have a `proposalId` parameter. Consider setting them as `indexed` to allow searching through all DAO events using it as a filter.

## **[Q-9]** Vote option is not part of the event body

The event `VoteCasted` should also contain the vote option as part of its body, in order to allow off-chain indexers to more easily integrate with your smart-contract.

## **[Q-10]** Use NatSpec format for comments

Solidity contracts can use a special form of comments to provide rich documentation for functions, return variables, and more. This special form is named the Ethereum Natural Language Specification Format (NatSpec).

Solidity contracts are recommended to be fully annotated using NatSpec for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others to audit and make your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.

# Nitpicks

## **[N-1]** New membership event

Consider emitting an event every time a new member joins the DAO, in order to allow off-chain indexer to more easily integrate with your smart-contract. It is pretty cheap to emit an event, and I believe it is a pretty important one for a DAO.

## **[N-2]** Comments

The lack of comments did not create friction in my understanding of the code because it is well written, and the variable and function names are very descriptive. Still, I suggest starting to habitually write comments, even for the simplest functions.

This will make your contracts look more professional and help other developers read them faster.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | 1     |
| Extra features             | -     |
| Vulnerability              | 6     |
| Unanswered design exercise | -     |
| Insufficient tests         | 2     |
| Technical mistake          | 1     |

Total: 10

Good job!
