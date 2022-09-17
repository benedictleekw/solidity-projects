# MacroDAO Solidity Project

This is the repo for all the Solidity smart contracts developed during the Macro Smart Contract Security Fellowship. Check out each project's individual README.md for more info.

Access the curriculum here: https://learn.0xmacro.com/

## Crowdfund

A smart contract that allows creators to register their projects. Award a ERC721 contributor badge NFTs to contributors that invest past a certain threshold. A project owner can deploy a fundraising contract through the factory contract with set fundraising goals and timelines. Once goal has been met, the creators can withdraw the funds. Investors are refunded their contributions if the fundraiser is unsuccessful or cancelled.

## Ico

A fundrasing ERC20 token with multiple phases. 
(1) Seed phase   : whitelist-only phase with limited indiviual and total contribution.
(2) General phase: public phase with limited indiviual and total contribution.
(3) Open phase   : open to public, where tokens become claimable.
Contract owner can pause/resume fundraising at anytime. The token is designed with an optional transfer tax. This project has been deployed to Rinkeby testnet, with a vanilla front-end.

## Dao

A governance smart contract for a decentralized autonomous organization (DAO) with the purpose of buying NFTs with treasury funds. Members can submit proposals to purchase NFTs or execute arbitrary code. Votes can be made either on-chain or off-chain with EIP-712 signature. 

## Lp

Adding liquidity pool for the ICO project, this smart contract is based off of Uniswap V2's decentralized exchange protocol that allows adding/removing liquidity and swaps through a constant curve formula. The contracts take special care to handle a token with internal transfer tax without unexpected slippage. This smartcontract address the flaw with Uniswap contract design prevents liquidity providers from unexpectedly donating additional funds to the pool if their provided liquidity ratio differs from the pool. This project has been deployed to Rinkeby testnet with a vanilla JS front-end.

## Multisig

Deploy and upgrade an OpenZeppelin Upgradeable Proxy/Logic contract using a Gnosis-safe managed multisig. The contract code was provided by Macro team. 

## Merkledrop

A token airdrop contract which distributes airdrops either through an immutable Merkle tree set at contract deployment, or EIP-712 compliant signatures signed by the contract owner.  