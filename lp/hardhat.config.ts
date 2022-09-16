import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require('dotenv').config();

const { ALCHEMY_KEY, INFURA_KEY, ACCOUNT_PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      accounts: {
        count: 35,
        accountsBalance: "10000000000000000000000000",
      },
      gas: 2100000,
      gasPrice: 8000000000
    },
    rinkeby: {
      // url: `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_KEY}`,
      url: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${ACCOUNT_PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  }
};

export default config;
