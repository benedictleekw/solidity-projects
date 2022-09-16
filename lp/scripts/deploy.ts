import { ethers } from "hardhat";

const treasuryAddr = "0x3D4Ad71682B8b4AbAF945a64189A1a82cb9741fd";

async function main() {
  const ICO = await ethers.getContractFactory("ICO");
  const ico = await ICO.deploy(treasuryAddr);

  await ico.deployed();
  console.log("ICO deployed to:", ico.address);

  const spc = await ethers.getContractAt("SpaceCoin", (await ico.token()));
  console.log("SPC address:", spc.address);

  const SpaceLP = await ethers.getContractFactory("SpaceLP");
  const lpToken = await SpaceLP.deploy(spc.address, treasuryAddr);

  await lpToken.deployed();
  console.log("SpaceLP deployed to:", lpToken.address);

  const SpaceRouter = await ethers.getContractFactory("SpaceRouter");
  const spcRouter = await SpaceRouter.deploy(lpToken.address, spc.address);

  await spcRouter.deployed();
  console.log("SpaceRouter deployed to:", spcRouter.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
