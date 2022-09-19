# Multisig Project

## About
Deploy and upgrade an OpenZeppelin Upgradeable Proxy/Logic contract using a Gnosis-safe managed multisig. The contract code was provided by Macro team. 

## Deliverables

My Gnosis Safe can be found here: `https://gnosis-safe.io/app/rin:0xEBF4D25865078f85E9CCD04C76C0db8B6d3E7272/home`

Contracts have been deployed to Rinkeby at the following addresses:

| Contract | Address Etherscan Link | Transaction Etherscan Link |
| -------- | ------- | --------- |
| Multisig | `https://rinkeby.etherscan.io/address/0xEBF4D25865078f85E9CCD04C76C0db8B6d3E7272` | `https://rinkeby.etherscan.io/tx/0x4ef8cd56888bb8903de3d881e5587c6926ad152de79f5d81cf3dc96eaac23c69` |
| Proxy | `https://rinkeby.etherscan.io/address/0x93cb644d000610b735baa7dfe2cccc82e7e9d858` | `https://rinkeby.etherscan.io/tx/0x1dc4d4c246cf10efe1aae32af3231be63751c7937f029c00e8a4cb2fb63581ed`|
| Logic | `https://rinkeby.etherscan.io/address/0xfb25dd785353d5483fd600fc87b0148c9771a7ce` | `https://rinkeby.etherscan.io/tx/0x35128fd0ddcee43b80af33f0731674eedec9a2d902c00fb8c54974b27f9084c9` |
| LogicImproved | `https://rinkeby.etherscan.io/address/0x2ca35f05f1c0028462dc9730ee77fa296f873458` | `https://rinkeby.etherscan.io/tx/0xcdff30cb81023a533cd26b19b0114e5ba98265e11aeb16aab3b4842da83f5bf4` |

Transaction for transferring the ownership of the **Proxy** contract to the multisig:

| Contract | Transaction Etherscan Link |
| -------- | -- |
| Proxy | `https://rinkeby.etherscan.io/tx/0xb153a4ee4a1c9f2b9418a0fe838d01d39a86d1ff37489248bdd1f88405ea468a` |

Transaction calling `upgrade(address)` to upgrade the **Proxy** from **Logic** -> **LogicImproved**
| Contract | Function called | Transaction Etherscan Link |
| --------------- | --------------- | -- |
| Proxy | `upgrade` | `https://rinkeby.etherscan.io/tx/0xd7444e0a59c54822c63ecd0083aca0670c41059e4539ab5a63d3d28657db5e55` |

# Design exercise

> Consider and write down the positive and negative tradeoffs of the following configurations for a multisig wallet. In particular, consider how each configuration handles the common failure modes of wallet security.

> - 1-of-N
> - M-of-N (where M: such that 1 < M < N)
> - N-of-N

## 1-of-N

### Advantages
Only 1 approval is needed for the tx to be execute
* Least fictions
* Fastest
* Allow more than 1 person to interact with the contract

### Disadvantages

* Defeat the purpose of multisig since only 1 approval is needed
* one bad owner can destory the whole system (single point of failure)

### M-of-N (where M: such that 1 < M < N)

### Advantages

* multiple approval is neeed for a tx to be executed
* There's no single point of failure

### Disadvantages

* Take longer for multiple wallet to approve a tx
* Slightly less gas efficient that having only 1 approval

### N-of-N

### Advantages

* Requires all owner in the party to agree on the tx to be executed
* There's no single point of failure

### Disadvantages

* The multi-sig becomes useless as soon as one person lost their wallet (single point of failure)
* Take longer for multiple wallet to approve a tx
* Slightly less gas efficient that having only 1 approval
