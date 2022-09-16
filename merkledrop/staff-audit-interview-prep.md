https://github.com/0xMacro/student.benedictleekw/tree/180385bb740eaef86c2ce193231c8506cab0e276/interview-prep

Audited By: Rares Stanciu

# Sudoku Challenge

Below you will find the staff audit for both of the interview question solutions you submitted. For the Sudoku Exchange problem, the audit will look a little different than you're used to. Instead of issues in the code you submitted, you will find several checklists of known vulnerabilities and known gas optimizations. We've added an `[x]` next to each item if you correctly identified that item in your submission, and a `[]` if not.

## General Comments

A gentle heads up: the Sudoku Exchange problem is intentionally very difficult. Usually only 1 student manages to find enough vulnerabilities and gas optimizations to pass. Please, use this as a benchmark for how much you've learned in the last 6 weeks (only 6 weeks!). Even better, for those items you missed we hope you use it as a guide for the attack vectors to look out for on your next interview/audit.

The devil is in the details. There are many hidden issues an auditor must find, which require a lot of cognitive load. A lot of smart contracts seem simple, but in fact every interaction is complicated when running in a public blockchain, and they are always most likely to cause problems.

Continue to read smart contracts and their audits, in order to build more confidence when analyzing a new contract.

Keep up the good work and keep on learning!

## Issues

### High Severity Vulnerabilities

- [x] `createReward()`'s `ERC20.transferFrom` call does not check the return value for success.

- [ ] `createReward()` allows overwriting of existing challenge reward/token/solved.

- [ ] Need to change the `.transfer` call to transfer to `msg.sender` so that it rewards the caller.

- [ ] Need to change data type from `memory` to `storage` so that it changes the storage value of the `ChallengeReward`.

- [ ] `claimReward` can be front-run. `SudokuExchange` needs to change the `claimReward` logic to use a 2-stage commit-reveal process where the first transaction commits `keccak256(msg.sender + random_salt)`, and then, after some number of a blocks, in a second transaction the actual solution is provided. The `msg.sender + random_salt` hash ensures that the second transaction cannot be front-run.

- [ ] Can be double-claimed. Need to check that it's not solved (or remove it from mapping).

- [x] `claimReward` is vulnerable to a reentrancy attack. (It would not be if it followed checks-effects-interactions.)

### Low Severity Vulnerabilities

- [ ] `claimReward`'s `ERC20.transfer` call does not check the return value for success.

- [ ] `createReward()` allows creating an already solved challenge (`solved=true`), locking tokens.

- [ ] The `challenge` argument in `claimReward` is controlled by the user, so they could pass in a contract address with a `validate` function that always returns `true`.

- [ ] `createReward` does not handle feeOnTransfer tokens, because it assumes the amount sent in `transferFrom` is the amount received by the SudokuExchange.

### Gas Optimizations

- [ ] Turn solc gas optimizations on.
- [ ] Gas savings from shorter error strings or Solidity Custom Errors.
- [ ] Do not create new contract with every challenge, instead store within `Challenge` struct on `SudokuExchange`.
- [ ] Only store hash of challenge and verify the hashed input challenge matches (similar to the implementatio [here](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/governance/Governor.sol#L256))
- [ ] Eliminate duplicate information from `ChallengeReward` struct. The `challenge` struct member on line 20 is identical to the key of `rewardChallenges` on line 30. Consider removing the `challenge` struct member.
- [ ] Remove a memory variable allocation by getting rid of `isCorrect` function variable in `claimReward`. It can be passed directly to the `require` on the next line.

### Code Quality Issues

- [x] There are no tests!
- [ ] The documet for comments, and add more variable, function, and contract comments.
- [ ] Explicitly markntation is sparse. Consider using the NatSpec forma the visibility of contract fields like `rewardChallenges` to be `public`.
- [ ] Add events to signify changes in the contract state.
- [x] Mark `createReward` and `validate` as external

## Score

1. You must find all but 1 of the High and Medium severity vulnerabilities in order to pass this interview.
2. You must have at least 3 of the Gas Optimizations to pass this interview.

Interview failed. 😔

# Signature MerkleDrop

## General Comments

Good job, Benedict!

I'm confident that having dedicated a little bit more time on writing tests for this this project you would've captured all these low hanging issues described below.

You've come a long way in the past 6 weeks and your skills have been improved considerably. Congratulations on completing the Fellowship! It was challenging, but now comes the reward.

Best of luck as you enter the world of Web3! And don't forget to never stop learning.

## Issues

### **[H-1]** `amount` not part of the Merkle leaf

Because on line 90 of `Airdrop.sol` you are using only the recipient's address in a Merkle leaf, any user can call the `merkleClaim` function with a valid signature but an `_amount` higher than the amount allocated for that particular user. This means that any valid signature can drain all the funds from the Airdrop contract.

Consider adding the amount in the Merkle leaf, in order to ensure the correct amounts are claimed.

---

### **[L-1]** `signatureClaim` verifies signature against `_to`, when it should check `msg.sender`

In `signatureClaim` the address checked is `_to` but it should be `msg.sender`. `msg.sender` is the address claiming tokens, `_to` is just the address the claimer wants to the tokens to be held in. This is a Low Vulnerability because it implies that someone other than the `msg.sender` can submit a signature to claim the MACRO token, and since the signatures are held in some offchain database, it’s possible for those signatures to be obtained by a single user who then causes all the tokens to be claimed. The actual `_to` recipients may not want this, for example for tax purposes (an honest claimer could have waited until the next tax year to claim their token, and pay their capital gains tax).

---

### **[Insufficient-Tests]** `signatureClaim` not covered by tests

Even though 100% test coverage does not ensure your smart contract is bug-free, aim to test every statement to increase your confidence in the code you've written.

---

### **[Q-1]** Events are not implemented

Though they are not an explicit requirement in the spec, it is a good practice to include events in your contract. Without them there is no easy way to track the history of the projects. In addition, they're useful for front end applications interacting with your contracts if you eventually implement them. In this case, contribution, refund, withdrawal, reaching the funding goal and project failure are all worthy of an event.

Consider adding events to your contracts.

## Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 4     |
| Unanswered design exercise | -     |
| Insufficient tests         | 2     |
| Technical mistake          | -     |

Total: 6

Good job!
