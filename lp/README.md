# LP Project

## Technical Spec
<!-- Here you should list the technical requirements of the project. These should include the points given in the project spec, but will go beyond what is given in the spec because that was written by a non-technical client who leaves it up to you to fill in the spec's details -->

SpaceCoin Token Spec
- Based off on ERC-20 token
- 500,000 max total supply
- Have all the supply being control my the ICO contract
- Only 150,000 of the supply are distribute doing the ICO
- A 2% tax on every transfer. The taxed SPC should go to the treasury* account
- A flag that toggles this tax on/off, controllable by owner, initialized to false

ICO Spec
- The smart contract aims to raise 30,000 Ether by performing an ICO. 
- The ICO should only be available to private investors added to the ICO's allowlist starting in Phase Seed with a maximum total private contribution limit of 15,000 Ether and an individual contribution limit of 1,500 Ether. 
- The ICO should become available to the general public during Phase General, with a total contribution limit equal to 30,000 Ether, inclusive of funds raised from the private phase. 
- During Phase General, the individual contribution limit should be 1,000 Ether. 
- In Phase Open, the individual contribution limit should be removed, but the total contribution limit should remain at 30,000 Ether. 
- Additionally in Phase Open, the ICO contract should release SpaceCoin tokens at an exchange rate of 5 tokens to 1 Ether. 
- The owner of the contract should have the ability to pause and resume fundraising at any time, as well as move a phase forwards (but not backwards) at will.
- Allow onwer to add new address to the seed investor list
- Allow withdrawing all the funds to treasury at any point of the phase.

Liquidity Pool Spec
- Based off on ERC-20 token.
- No max supply.
- Liquidity pair is ETH-SPC.
- LP tokens are minted when equal amount of ETH and SPC token are deposit into the liquidity pool.
- LP token can be burn in order to withdraw back ETH and SPC.
- Allow swaping tokens from ETH to SPC and SPC to ETH.
- There's a 1% swapping fees that goes to liquidity provider.

## Design Exercise Answer
<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> How would you extend your LP contract to award additional rewards – say, a separate ERC-20 token – to further incentivize liquidity providers to deposit into your pool?

List of ideas to incentivize liquidity provider:
1) The most common LP mining program is to allow LP holder to stake their LP token and in return recieve SPC token based on an emission rate and the amount of SPC that is allocated for the mining program. Staking LP token and the calculation of SPC emission rate, will be part of a separate contract which takes LP token from LP holder. The downside is that there's a limited time for a mining program to run.
2) Create a LP staking reward system that gives out a separate ERC-20 token. This token can serve various purpose such as DAO (voting power), burnable for merchandise, etc.
3) Create a tier system for LP token holder. Higher tier can be achieve by owning a larger amount of LP token. The higher the tier the better the reward. These reward can be utility, alpha groups, NFT whitelist, access to private ICO, etc.

## Testnet Deploy Information

| Contract | Address Etherscan Link |
| -------- | ------- |
| SpaceCoin | https://rinkeby.etherscan.io/address/0x52cDa0917224C007C319433fa95681B4413c226a |
| ICO | https://rinkeby.etherscan.io/address/0x820996dDAB9c62efEA2368F1d4D7aB93949D6289 |
| Router | https://rinkeby.etherscan.io/address/0xCCB8A8A96f61082152213cea639d49592Da7Eeba |
| Pool | https://rinkeby.etherscan.io/address/0x6E8fB0B315DBB64626e4C4e9F75e5d8bD1433490 |


## Unfinised feature
1) Add checking deadline on swaps.
2) The swap logic is not working as intended (unit test for swap missing and unable to fully test the front end)

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
npx hardhat run scripts/deploy.ts --network rinkeby  # deploy to rinkeby
npx hardhat verify --network rinkeby 0x820996dDAB9c62efEA2368F1d4D7aB93949D6289 ${constructor args} # verify ico contract
npx hardhat verify --network rinkeby 0x52cDa0917224C007C319433fa95681B4413c226a --constructor-args scripts/verification/spacecoin.js  #verify spacecoin
```