# ICO Project

## About
A fundrasing ERC20 token with multiple phases. 
(1) Seed phase   : whitelist-only phase with limited indiviual and total contribution.
(2) General phase: public phase with limited indiviual and total contribution.
(3) Open phase   : open to public, where tokens become claimable.
Contract owner can pause/resume fundraising at anytime. The token is designed with an optional transfer tax. This project has been deployed to Rinkeby testnet, with a vanilla front-end.

## Technical Spec
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
- 

## Design Exercise Answer
> The base requirements give contributors their SPC tokens immediately. How would you design your contract to vest the awarded tokens instead, i.e. award tokens to users over time, linearly?

There's several ways this can be done that would give the contributors flexibility and making sure the circulation supply is in control. If seed investor as getting vast discounted price as compare to public investor, it is the norm that seed investor will have a large portion of their token lock. This can be done thru the a separate smartcontract which will hold all the token that is being lock with x amount of time. After x amount of time, seed investors are free to redeem their token. 

One other approach is to create different lock period and each of these lock pool will provide higher yield based on the longer the locking period is. 

## Testnet Deploy Information

| Contract  | Address Etherscan Link                                                            |
| --------  | --------------------------------------------------------------------------------- |
| SpaceCoin | `https://rinkeby.etherscan.io/address/0x0cc86fc5b89bc3e3a55828595d133c5965c1ee57` |
| ICO       | `https://rinkeby.etherscan.io/address/0x899453F7437478BE0bc654364573C24591956a2d` |

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
