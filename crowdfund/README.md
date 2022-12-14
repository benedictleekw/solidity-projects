# Crowdfund Project

## About
A smart contract that allows creators to register their projects. Award a ERC721 contributor badge NFTs to contributors that invest past a certain threshold. A project owner can deploy a fundraising contract through the factory contract with set fundraising goals and timelines. Once goal has been met, the creators can withdraw the funds. Investors are refunded their contributions if the fundraiser is unsuccessful or cancelled.

## Technical Spec
- The smart contract is reusable; multiple projects can be registered and accept ETH concurrently.
    - Specifically, you should use the factory contract pattern.
        - When a new project is added a number of fields need to be stored: creator wallet, goal target, deadline, project name and NFT symbol. These fields will be keep on chain. 
- The goal is a preset amount of ETH.
    - This cannot be changed after a project gets created. (mark goal variable with immutable)
    - The goal will be pass to the contructor on initialized.
- Regarding contributing:
    - Add enum state of Active
    - The contribute amount must be at least 0.01 ETH.
    - There is no upper limit.
    - Anyone can contribute to the project, including the creator.
    - One address can contribute as many times as they like.
    - No one can withdraw their funds until the project either fails or gets cancelled.
- Regarding contributer badges:
    - Contributer badges are ERC-721 token. Start with ID of 1 and increment based on currentSupply. 
    - An address receives a badge if their total contribution is at least 1 ETH.
    - One address can receive multiple badges, but should only receive 1 badge per 1 ETH.
    - Each project should use its own NFT contract.
- If the project is not fully funded within 30 days:
    - Add enum state of Failed
    - The project goal is considered to have failed.
    - No one can contribute anymore.
    - Supporters get their money back.
        - Need to make sure we follow the pattern of "checks, effects, interactions" to prevent from re-entrancy attack.
        - Mark untrusted function
    - Contributor badges are left alone. They should still be tradable.
    - The project deadline will be pass to the contructor on initialized and add 30 days from the block.timestamp.
- Once a project becomes fully funded:
    - Add enum state of Succesful
    - No one else can contribute (however, the last contribution can go over the goal).
    - The creator can withdraw any amount of contributed funds.
        - Need to make sure we follow the pattern of "checks, effects, interactions" to prevent from re-entrancy attack.
        - Mark untrusted function
- The creator can choose to cancel their project before the 30 days are over, which has the same effect as a project failing.

## Design Exercise Answer
> Smart contracts have a hard limit of 24kb. Crowdfundr hands out an NFT to everyone who contributes. However, consider how Kickstarter has multiple contribution tiers. How would you design your contract to support this, without creating three separate NFT contracts?

Instead of distributing 1 NFT for every 1 ETH contributed, with the introduction of contribution tier. We can use metadata to update the NFT with specific traits. This can be store off-chain database or IPFS. Since updating metadata is offchain, we wont need to worry about gas. To achieve this, everytime a contribution happen, the smartcontract will emit an event and we will have workers monitoring the event to update the NFT metadata/contribution tiers based on the information from the event. 

Another approach is to use ERC-1155 to have a NFT for each contribution tiers. This would match kickstarter model more with each contribution tier NFT having a set amount of supply. This approach would not require any offchain metadata updates. We can keep track of the total contributed amount and mint the user the "tier-based" NFT based on how much they contributed. 

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