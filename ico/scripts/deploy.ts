import { ethers } from "hardhat";

async function main() {
  const ICO = await ethers.getContractFactory("ICO");
  const ico = await ICO.deploy("0x3D4Ad71682B8b4AbAF945a64189A1a82cb9741fd");

  await ico.deployed();

  console.log("ICO deployed to:", ico.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
