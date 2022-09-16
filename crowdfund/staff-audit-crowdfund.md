https://github.com/0xMacro/student.benedictleekw/tree/5eaa0fca012335cdb2d873de2d95779979a60a37/crowdfund

Audited By: Alex.S

# General Comments

There is good code here and you have successfully implemented most of the requirements. The problems with NFT calculation could perhaps have been found with more testing of different contribution scenarios, such as contributions over 2 ETH. It's also good to develop the practice of carefully reviewing the code before submission. This can find quite a lot of problems, such as the problem here with the `mint` function being public instead of private.


# Design Exercise

I think both of these approaches would work. Using ERC 1155 is probably the more straightforward.


# Issues

**[M-1]** Anyone can mint NFTs

The `mint` function is `public` and does not have the `onlyCreator` modifier, so anyone can successfully call it. 

All NFT minting should be in response to contributions, so nobody needs to call the `mint` function directly and it should be `private`.


**[M-2]** Does not always award NFTs when it should

The `contribute` function mints at most 1 NFT at a time. Anyone making a single contribution for which multiple NFTs should be awarded will only receive one. 

The following failing test illustrates this:

```typescript
it("Correctly handles contributions > 2 ETH", async () => {
  const { deployer, alice, projectFactory } = await loadFixture(setupFixture);

  const txReceiptUnresolved = await projectFactory.connect(deployer).create(ethers.utils.parseEther("5"), "Project 2", "PROJ2");
  const txReceipt = await txReceiptUnresolved.wait();

  const projectAddress = txReceipt.events![0].args![0];
  const project: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;
    
  await project.connect(alice).contribute({ value: ethers.utils.parseEther("2.3") });
  expect(await project.balanceOf(alice.address)).to.equal(2);
});
```

In addition, under some circumstances contributions which should result in an award of 1 ETH may not get any. This is because the logic starting at line 52 does not track the unused portion of previous donations exceeding 1 ETH correctly. The value of `initialContribution % 10`, calculated at line 53, will generally be 0 and at most can be 9. That is a very small value considering that the units are Wei. 

As a result, a contribution of 1.2 ETH followed by one of 0.9 ETH will result in just 1 NFT being awarded for the first contribution. Nothing will be awarded for the second contribution, even though it takes the total contributed to over 2 ETH.

The following failing test shows this:
```typescript
it("Awards a contributor a second badge if they contribute 1.2 followed by 0.9 ", async () => {
  const { deployer, alice, projectFactory } = await loadFixture(setupFixture);

  const txReceiptUnresolved = await projectFactory.connect(deployer).create(ethers.utils.parseEther("5"), "Project 2", "PROJ2");
  const txReceipt = await txReceiptUnresolved.wait();

  const projectAddress = txReceipt.events![0].args![0];
  const project: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;
    
  await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.2") });
  expect(await project.balanceOf(alice.address)).to.equal(1);
  await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.9") });
  expect(await project.balanceOf(alice.address)).to.equal(2);
});
```

**[Extra-Feature-1]** Unnecessary `fallback` and `receive` functions

The presence of both a `receive` and a `payable` `fallback` function in `Project.sol` mean that if someone sends funds directly to the contract, either (a) with no calldata, or (b) with calldata that does not match any of the contract's externally callable functions, then these funds will be accepted. 

However, despite the fact that the contract has received funds, the contribution will not be recorded! That means that:

1. The contribution will not count towards any NFT award
2. The contribution will not be refundable in the event that the project fails or is cancelled.

It would be preferable to not have these functions. Without them, any such calls would be reverted.


**[Q-1]** Checks, effects, interactions pattern not followed

In the `Project.sol` functions `untrustedWithdrawals` and `untrustedRefunds` the external call to transfer funds is performed before the effect of emitting the corresponding event. Events are easy to overlook as effects, but they should come before interactions. It is better to get into the habit of always working this way, even in cases such as this where no vulnerability arises from emitting the event after the interaction.

**[Q-2]** Unnecesary setting of storage variables to default values

On Line 19 of `Project.sol` you set `projectEnded` to `false`.

Every variable type has a default value it gets set to upon declaration. Unnecessarily initalizing a variable to it's default value costs gas. This can be avoided as follows: 

For example:
```solidity
address a;  // will be initialized to the 0 address (address(0))
uint256 b;  // will be initialized to 0
bool c;     // will be initialized to false
```

Consider not setting initial values for storage variables that would otherwise be equal to their default values.

# Nitpicks

### `Project.sol`

- Line 85: The function `untrustedRefunds` is `public`, but it is not called from within the contract so it would be better to make it `external` 
- Line 50: Unnecessary lookup of `fundsContributed[msg.sender]`. You already looked up that value on Line 49 and stored it in the variable `initalContribution`. Re-use your variable!
- Line 105: Unnecessary variable `newItemId`. You only use this on Line 106, but you could instead just reference `currentNFTSupply`.
- Line 107: Unnecessary `return`


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | 1 |
| Vulnerability              | 4 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total: 5

Good job!

