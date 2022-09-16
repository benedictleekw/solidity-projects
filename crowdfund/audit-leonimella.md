# Contract Micro Audit

## Classification Legend

| Severity           | Code | Description                                                                                                                                             |
| ------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High               | H-n  | This issue can take the entire project down. Ownership can get hacked, funds can get stolen, bad actors can grief everyone else, these sorts of things. |
| Medium             | M-n  | There's some large potential risk, but it's not obvious whether the issue will actually happen in practice.                                             |
| Low                | L-n  | A small amount of risk, perhaps unlikely, perhaps not relevant, but notable nonetheless.                                                                |
| Technical Mistake  | TM-n | No security threats, but not working as intended in the specification                                                                                   |
| Unfinished Feature | UF-n | Unfinished Features described in the specification                                                                                                      |
| Extra Feature      | EF-n | Extra features added to the project                                                                                                                     |
| Code Quality       | Q-n  | No obvious risk, but fixing it improves code quality, better conforms to standards, and ultimately may reduce unperceived risk in the future.           |

## **[TM-1]** Badge mint is public with no checks

On line 103, Project.sol has the following code:

```solidity
function mint() public returns (uint256) {
  currentNFTSupply++;
  uint256 newItemId = currentNFTSupply;
  _safeMint(msg.sender, newItemId);
  return newItemId;
}

```

In this code, the `mint` function is `public` and has no checks allowing unlimited badge minting

Consider:

- Restrict function visibility to `internal`
- Add checks to see if the user is a contributor and has a claim to the badge, as specified in the specs

## **[UF-1]** Mint of badges won't work as specified

On line 52, Project.sol has the following code:

```solidity
if (initialContribution > 1 ether) {
  initialContribution = initialContribution % 10;
}
if (msg.value + initialContribution >= 1 ether) {
  mint();
}
```

This condition will not properly grant the user **1 badge** for each **1 ether** donated. In order for this to work, you would have to know the delta between how much a user has contributed and how many badges they have then mint the appropriate amount of badges. Pseudo code for reference below:

```solidity
uint256 delta = ethBalance - (badgeBalance * 1 ** 18);

if (delta >= 1 ether) {
  uint256 quantityToBeMinted = delta / (1 ** 18);
  // loop calling _safeMint() and updating balance
}
```

## **[Q-1]** Contract name on errors strings

To better understand where a revert happened it's nice to prepend it with the contract's name.
In line 36, Project.sol has:

```solidity
require(msg.sender == creator, "The sender is not project owner");
```

Consider:

```solidity
require(msg.sender == creator, "Project: The sender is not project owner");
```

This makes it clearer in which contract the error happened

## **[Q-2]** Avoid using hardcoded values

Some logic could be easier to read if you use constant values. In lines 52 and 55, Project.sol has:

```solidity
if (initialContribution > 1 ether) {
  initialContribution = initialContribution % 10;
}
if (msg.value + initialContribution >= 1 ether) {
  mint();
}
```

The `1 ether` value could be assigned to a constant, i.e: `MIN_BADGE_CONTRIBUTION` to improve the reading of this logic making it easier to understand like the code below:

```solidity
uint private constant MIN_BADGE_CONTRIBUTION = 1 ether;

// Contract implementation

if (initialContribution > MIN_BADGE_CONTRIBUTION) {
  initialContribution = initialContribution % 10;
}
if (msg.value + initialContribution >= MIN_BADGE_CONTRIBUTION) {
  mint();
}
```

If a person that doesn't has familiarity with the project check this condition, could be hard to understand why `1 ether`, this is how the constant helps and since `constant` doesn't consume storage memory I believe it's a good tradeoff.

## **[Q-3]** Short form to increment state variable

In lines 50, 51. Project.sol has the following code:

```solidity
fundsContributed[msg.sender] = fundsContributed[msg.sender] + msg.value;
currentAmount = currentAmount + msg.value;
```

This makes the code a bit cluttered and hard to read. Consider using a the `+=` form:

```solidity
fundsContributed[msg.sender] += msg.value;
currentAmount += msg.value;
```

## **[Q-4]** Better `cacelations` function implementation

This is just my opinion, but in line 97, Project.sol has the `cancelations` function implementation:

```solidity
function cancelations() external onlyCreator {
  require(checkState() == State.Active, "The project is not active");
  deadline = block.timestamp;
  emit ProjectCancelation(currentAmount);
}

```

Moving `deadline` forward could have unknown side effects. In your contract, you have the `projectEnded` state variable that determines if the project has ended or not, you should update this variable instead since the name and use of it is more suitable than moving the project's deadline.

```solidity
function cancelations() external onlyCreator {
  require(checkState() == State.Active, "The project is not active");
  projectEnded = true;
  emit ProjectCancelation(currentAmount);
}

```

## **[Q-5]** Unecessary state variables

The `finalAmount` and `currentAmount` state variables are unecessary since the `untrustedWithdrawals` function should withdraw all the balance in the contract.

## **[Q-6]** Following code format standards

It's nice to have a code formatting tool to help keep code clean and organized.

In several locations, your code goes beyond the 80 columns line making it stretch too far right. You could use a tool like [Prettier](https://prettier.io/) to break it into more lines so it doesn't cross this 80 columns "barrier".

The cool thing about **Prettier** is that he will format your code automatically after every save so you don't have to worry about these silly things and focus on logic!

This is just a good practice that makes your code more easy to read and therefore more understandable, it's not bad the way it is, just giving you a tip!
