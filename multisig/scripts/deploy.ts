import { ethers } from "hardhat";
import { Logic, LogicImproved } from "../typechain-types";

const gnosis_wallet = "0xEBF4D25865078f85E9CCD04C76C0db8B6d3E7272";

async function main() {
  const Logic = await ethers.getContractFactory("Logic");
  const logic : Logic = await Logic.deploy() as Logic;
  await logic.deployed();

  console.log("logic deployed to:", logic.address);

  const LogicImproved = await ethers.getContractFactory("LogicImproved");
  const logicImproved : LogicImproved = await LogicImproved.deploy() as LogicImproved;
  await logicImproved.deployed();

  console.log("logicImproved deployed to:", logicImproved.address);

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxy : Logic = await Proxy.deploy(logic.address) as Logic;
  await proxy.deployed();

  console.log("proxy deployed to:", proxy.address);

  // we need to be able to call the Logic contract's functions
  // on the proxy, so to do that we use `.attach` to treat the
  // contract at the proxy's address as if it were a Logic contract.
  // This works because the proxy forwards all function calls using
  // its `fallback` function.
  const attachedProxy = logic.attach(proxy.address);

  console.log(`owner before: ${await attachedProxy.owner()}`)

  let tx = await attachedProxy.initialize(42);
  await tx.wait()

  const tx_gnosis = await attachedProxy.transferOwnership(gnosis_wallet);
  await tx_gnosis.wait();

  console.log(`owner after: ${await attachedProxy.owner()}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
