// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this first project, we've provided a significant amount of scaffolding
  in your test suite. We've done this to:

    1. Set expectations, by example, of where the bar for testing is.
    3. Reduce the amount of time consumed this week by "getting started friction".

  Please note that:

    - We will not be so generous on future projects!
    - The tests provided are about ~90% complete.
    - IMPORTANT:
      - We've intentionally left out some tests that would reveal potential
        vulnerabilities you'll need to identify, solve for, AND TEST FOR!

      - Failing to address these vulnerabilities will leave your contracts
        exposed to hacks, and will certainly result in extra points being
        added to your micro-audit report! (Extra points are _bad_.)

  Your job (in this file):

    - DO NOT delete or change the test names for the tests provided
    - DO complete the testing logic inside each tests' callback function
    - DO add additional tests to test how you're securing your smart contracts
         against potential vulnerabilties you identify as you work through the
         project.

    - You will also find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace with
      whatever is appropriate.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers, } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Project, ProjectFactory } from "../typechain-types";

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number) => {
  await time.increase(seconds);
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const timeTravelTo = async (seconds: number) => {
  await time.increaseTo(seconds);
};

// Compare two BigNumbers that are close to one another.
//
// This is useful for when you want to compare the balance of an address after
// it executes a transaction, and you don't want to worry about accounting for
// balances changes due to paying for gas a.k.a. transaction fees.
const closeTo = async (a: BigNumberish, b: BigNumberish, margin: number) => {
  expect(a).to.be.closeTo(b, margin)
};
// ----------------------------------------------------------------------------

describe("Crowdfundr", () => {
  // See the Hardhat docs on fixture for why we're using them:
  // https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures
  // In particular, they allow you to run your tests in parallel using
  // `npx hardhat test --parallel` without the error-prone side-effects
  // that come from using mocha's `beforeEach`
  async function setupFixture() {
    const [deployer, alice, bob]: SignerWithAddress[] = await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function if your
    //       ProjectFactory contract's constructor has input parameters
    const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    const projectFactory: ProjectFactory =
      (await ProjectFactory.deploy()) as ProjectFactory;
    await projectFactory.deployed();

    const txReceiptUnresolved = await projectFactory.create(ethers.utils.parseEther("1"), "Project 1", "PROJ1");
    const txReceipt = await txReceiptUnresolved.wait();

    const projectAddress = txReceipt.events![0].args![0];
    const project: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;

    return { projectFactory, deployer, alice, bob, project, projectAddress }
  };

  describe("ProjectFactory: Additional Tests", () => {
    /* 
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up writing Solidity code to protect against a
            vulnerability that is not tested for below, you should add
            at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */
  });

  describe("ProjectFactory", () => {
    it("Deploys a contract", async () => {
      const { projectFactory } = await loadFixture(setupFixture);

      expect(projectFactory.address).to.be.a.properAddress;
    });

    it("Can register a single project", async () => {
      const { projectAddress } = await loadFixture(setupFixture);

      expect(projectAddress).to.be.a.properAddress;
    });

    it("Can register multiple projects", async () => {
      const { projectFactory, projectAddress } = await loadFixture(setupFixture);

      const txReceiptUnresolved = await projectFactory.create(ethers.utils.parseEther("1"), "Project 2", "PROJ2");
      const txReceipt = await txReceiptUnresolved.wait();

      const projectAddress2 = txReceipt.events![0].args![0];

      expect(projectAddress).to.be.a.properAddress;
      expect(projectAddress2).to.be.a.properAddress;
    });

    it("Registers projects with the correct owner", async () => {
      const { projectFactory, alice } = await loadFixture(setupFixture);

      const txReceiptUnresolved = await projectFactory.connect(alice).create(ethers.utils.parseEther("1"), "Project 3", "PROJ3");
      const txReceipt = await txReceiptUnresolved.wait();

      const projectAddress = txReceipt.events![0].args![0];
      const project: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;

      expect(await project.creator()).to.be.equal(alice.address);
    });

    it("Registers projects with a preset funding goal (in units of wei)", async () => {
      const { project } = await loadFixture(setupFixture);

      expect(await project.goalAmount()).to.be.equal(ethers.utils.parseEther("1"));
    });

    it('Emits a ProjectCreated event after registering a project', async () => {
      const { projectFactory, alice } = await loadFixture(setupFixture);

      const txReceiptUnresolved = await projectFactory.connect(alice).create(ethers.utils.parseEther("1"), "Project 2", "PROJ2");
      const txReceipt = await txReceiptUnresolved.wait();

      const projectAddress = txReceipt.events![0].args![0];

      expect(txReceiptUnresolved)
        .to.emit(projectFactory, "ProjectCreated")
        .withArgs(projectAddress, alice.address, ethers.utils.parseEther("1"))
    });

    it("Allows multiple contracts to accept ETH simultaneously", async () => {
      const { projectFactory, project, alice } = await loadFixture(setupFixture);

      const txReceiptUnresolved = await projectFactory.create(ethers.utils.parseEther("1"), "Project 2", "PROJ2");
      const txReceipt = await txReceiptUnresolved.wait();

      const projectAddress2 = txReceipt.events![0].args![0];
      const project2: Project = (await ethers.getContractAt("Project", projectAddress2)) as Project;
      await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
      expect(await project.fundsContributed(alice.address)).to.be.equal(ethers.utils.parseEther("0.5"));

      await project2.connect(alice).contribute({ value: ethers.utils.parseEther("0.3") });
      expect(await project2.fundsContributed(alice.address)).to.be.equal(ethers.utils.parseEther("0.3"));
    });
  });

  describe("Project: Additional Tests", () => {
    /* 
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up protecting against a vulnerability that is not
            tested for below, you should add at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */
  });

  describe("Project", () => {
    describe("Contributions", () => {
      describe("Contributors", () => {
        it("Allows the creator to contribute", async () => {
          const { project, deployer } = await loadFixture(setupFixture);
          
          await project.contribute({ value: ethers.utils.parseEther("0.5") });

          expect(await project.fundsContributed(deployer.address)).to.be.equal(ethers.utils.parseEther("0.5"));
        });

        it("Allows any EOA to contribute", async () => {
          const { project, alice } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.fundsContributed(alice.address)).to.be.equal(ethers.utils.parseEther("0.5"));
        });

        it("Allows an EOA to make many separate contributions", async () => {
          const { project, alice } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.fundsContributed(alice.address)).to.be.equal(ethers.utils.parseEther("0.5"));

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.3") });
          expect(await project.fundsContributed(alice.address)).to.be.equal(ethers.utils.parseEther("0.8"));
        });

        it('Emits a ContributionReceived event after a contribution is made', async () => {
          const { project, alice } = await loadFixture(setupFixture);
          
          const txReceiptUnresolved = await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
          expect(txReceiptUnresolved)
            .to.emit(project, "ContributionReceived")
            .withArgs(alice.address, ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5"));
        });
      });

      describe("Minimum ETH Per Contribution", () => {
        it("Reverts contributions below 0.01 ETH", async () => {
          const { project, deployer } = await loadFixture(setupFixture);
          
          await expect(
            project.contribute({ value: ethers.utils.parseEther("0.009") })
          ).to.be.revertedWith("Contribute amount is less than 0.01 ETH");
        });

        it("Accepts contributions of exactly 0.01 ETH", async () => {
          const { project, alice } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.01") });
          expect(await project.currentAmount()).to.be.equal(ethers.utils.parseEther("0.01"));
        });
      });

      describe("Final Contributions", () => {
        it("Allows the final contribution to exceed the project funding goal", async () => {
          const { project, alice } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          const projectGoal = await project.goalAmount();
          expect(await project.currentAmount()).to.be.greaterThan(projectGoal);
        });

        it("Prevents additional contributions after a project is fully funded", async () => {
          const { project, alice } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });

          await expect(
            project.connect(alice).contribute({ value: ethers.utils.parseEther("0.1") })
          ).to.be.revertedWith("The project is not active");
        });

        it("Prevents additional contributions after 30 days have passed since Project instance deployment", async () => {
          const { project, alice } = await loadFixture(setupFixture);

          await timeTravel(2592000);
          
          await expect(
            project.connect(alice).contribute({ value: ethers.utils.parseEther("0.1") })
          ).to.be.revertedWith("The project is not active");
        });
      });
    });

    describe("Withdrawals", () => {
      describe("Project Status: Active", () => {
        it("Prevents the creator from withdrawing any funds", async () => {
          const { project } = await loadFixture(setupFixture);

          await expect(
            project.untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The project is not successful");
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          const { project, alice } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });

          await expect(
            project.connect(alice).untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The sender is not project owner");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          const { project, alice, bob } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });

          await expect(
            project.connect(bob).untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The sender is not project owner");
        });
      });

      describe("Project Status: Success", () => {
        it("Allows the creator to withdraw some of the contribution balance", async () => {
          const { project, deployer, alice } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          await project.connect(deployer).untrustedWithdrawals(ethers.utils.parseEther("0.5"));
          expect(await project.currentAmount()).to.be.lessThan(ethers.utils.parseEther("1.1"));
        });

        it("Allows the creator to withdraw the entire contribution balance", async () => {
          const { project, deployer, alice } = await loadFixture(setupFixture);
          
          let initialBalance = await ethers.provider.getBalance(deployer.address);
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          await project.connect(deployer).untrustedWithdrawals(ethers.utils.parseEther("1.1"));
          let finalBalance = await ethers.provider.getBalance(deployer.address)
          let difference = finalBalance.sub(initialBalance);
          closeTo(difference, ethers.utils.parseEther("1.1"), 0.1);
        });

        it("Allows the creator to make multiple withdrawals", async () => {
          const { project, deployer, alice } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          await project.connect(deployer).untrustedWithdrawals(ethers.utils.parseEther("0.5"));
          expect(await project.currentAmount()).to.be.lessThan(ethers.utils.parseEther("1.1"));
          await project.connect(deployer).untrustedWithdrawals(ethers.utils.parseEther("0.5"));
          expect(await project.currentAmount()).to.be.lessThan(ethers.utils.parseEther("0.6"));
        });

        it("Prevents the creator from withdrawing more than the contribution balance", async () => {
          const { project, deployer, alice } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          await expect(
            project.connect(deployer).untrustedWithdrawals(ethers.utils.parseEther("1.2"))
          ).to.be.revertedWith("Cannot withdraw more than leftover balance");
        });

        it('Emits a WithdrawalFunds event after a withdrawal is made by the creator', async () => {
          const { project, deployer, alice } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          const tx = await project.connect(deployer).untrustedWithdrawals(ethers.utils.parseEther("0.5"));
          
          expect(tx)
            .to.emit(project, "WithdrawalFunds")
            .withArgs(ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.6"));
        });

        it("Prevents contributors from withdrawing any funds", async () => {
          const { project, alice } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          await expect(
            project.connect(alice).untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The sender is not project owner");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          const { project, alice, bob } = await loadFixture(setupFixture);

          await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
          await expect(
            project.connect(bob).untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The sender is not project owner");
        });
      });

      describe("Project Status: Failure", () => {
        it("Prevents the creator from withdrawing any funds (if not a contributor)", async () => {
          const { project, deployer, alice } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
          await timeTravel(2592000); // after 30 days
          
          await expect(
            project.connect(deployer).untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The project is not successful");
        });

        it("Prevents contributors from withdrawing any funds (though they can still refund)", async () => {
          const { project, alice } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
          await timeTravel(2592000); // after 30 days
          
          await expect(
            project.connect(alice).untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The sender is not project owner");
        });

        it("Prevents non-contributors from withdrawing any funds", async () => {
          const { project, alice, bob } = await loadFixture(setupFixture);
          
          await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
          await timeTravel(2592000); // after 30 days
          
          await expect(
            project.connect(bob).untrustedWithdrawals(ethers.utils.parseEther("0.5"))
          ).to.be.revertedWith("The sender is not project owner");
        });
      });
    });

    describe("Refunds", () => {
      it("Allows contributors to be refunded when a project fails", async () => {
        const { project, alice } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
        await timeTravel(2592000); // after 30 days

        let initialBalance = await ethers.provider.getBalance(alice.address);
        await project.connect(alice).untrustedRefunds();
        let finalBalance = await ethers.provider.getBalance(alice.address)
        let difference = finalBalance.sub(initialBalance);
        closeTo(difference, ethers.utils.parseEther("0.5"), 0.1);
      });

      it("Prevents contributors from being refunded if a project has not failed", async () => {
        const { project, alice } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });

        await expect(
          project.connect(alice).untrustedRefunds()
        ).to.be.revertedWith("The project did not failed");
      });

      it('Emits a RefundFunds event after a a contributor receives a refund', async () => {
        const { project, alice } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
        await timeTravel(2592000); // after 30 days

        const tx = await project.connect(alice).untrustedRefunds();
        expect(tx)
          .to.emit(project, "RefundFunds")
          .withArgs(alice.address, ethers.utils.parseEther("0.5"));
      });
    });

    describe("Cancelations (creator-triggered project failures)", () => {
      it("Allows the creator to cancel the project if < 30 days since deployment has passed ", async () => {
        const { project, deployer, alice } = await loadFixture(setupFixture);

        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
        await timeTravel(2505600); // after 29 days

        await project.connect(deployer).cancelations();
        let initialBalance = await ethers.provider.getBalance(alice.address);
        await project.connect(alice).untrustedRefunds();
        let finalBalance = await ethers.provider.getBalance(alice.address)
        let difference = finalBalance.sub(initialBalance);
        closeTo(difference, ethers.utils.parseEther("0.5"), 0.1);
      });

      it("Prevents the creator from canceling the project if at least 30 days have passed", async () => {
        const { project, deployer, alice } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
        await timeTravel(2592000); // after 30 days
        
        await expect(
          project.connect(deployer).cancelations()
        ).to.be.revertedWith("The project is not active");
      });

      it('Emits a ProjectCancelation event after a project is cancelled by the creator', async () => {
        const { project, deployer, alice } = await loadFixture(setupFixture);

        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
        await timeTravel(2505600); // after 29 days

        const tx = await project.connect(deployer).cancelations();
        expect(tx)
        .to.emit(project, "ProjectCancelation")
        .withArgs(ethers.utils.parseEther("0.5"));
      });
    });

    describe("NFT Contributor Badges", () => {
      it("Awards a contributor with a badge when they make a single contribution of at least 1 ETH", async () => {
        const { project, alice } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
        expect(await project.balanceOf(alice.address)).to.be.equal(1);
      });

      it("Awards a contributor with a badge when they make multiple contributions to a single project that sum to at least 1 ETH", async () => {
        const { project, alice } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.8") });
        expect(await project.balanceOf(alice.address)).to.be.equal(1);
      });

      it("Does not award a contributor with a badge if their total contribution to a single project sums to < 1 ETH", async () => {
        const { project, alice } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.5") });
        expect(await project.balanceOf(alice.address)).to.be.equal(0);
      });

      it("Awards a contributor with a second badge when their total contribution to a single project sums to at least 2 ETH", async () => {
        const { deployer, alice, projectFactory } = await loadFixture(setupFixture);

        const txReceiptUnresolved = await projectFactory.connect(deployer).create(ethers.utils.parseEther("5"), "Project 2", "PROJ2");
        const txReceipt = await txReceiptUnresolved.wait();

        const projectAddress = txReceipt.events![0].args![0];
        const project: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.2") });
        expect(await project.balanceOf(alice.address)).to.be.equal(2);
      });

      it("Does not award a contributor with a second badge if their total contribution to a single project is > 1 ETH but < 2 ETH", async () => {
        const { deployer, alice, projectFactory } = await loadFixture(setupFixture);

        const txReceiptUnresolved = await projectFactory.connect(deployer).create(ethers.utils.parseEther("5"), "Project 2", "PROJ2");
        const txReceipt = await txReceiptUnresolved.wait();

        const projectAddress = txReceipt.events![0].args![0];
        const project: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("0.8") });
        expect(await project.balanceOf(alice.address)).to.be.equal(1);
      });

      it("Awards contributors with different NFTs for contributions to different projects", async () => {
        const { project, deployer, alice, projectFactory } = await loadFixture(setupFixture);

        const txReceiptUnresolved = await projectFactory.connect(deployer).create(ethers.utils.parseEther("5"), "Project 2", "PROJ2");
        const txReceipt = await txReceiptUnresolved.wait();

        const projectAddress = txReceipt.events![0].args![0];
        const project2: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
        await project2.connect(alice).contribute({ value: ethers.utils.parseEther("1.8") });
        expect(await project.balanceOf(alice.address)).to.be.equal(1);
        expect(await project2.balanceOf(alice.address)).to.be.equal(1);
      });

      it("Allows contributor badge holders to trade the NFT to another address", async () => {
        const { project, alice, bob } = await loadFixture(setupFixture);
          
        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
        expect(await project.balanceOf(alice.address)).to.be.equal(1);

        await project.connect(alice).transferFrom(alice.address, bob.address, 1, { from: alice.address});
        expect(await project.ownerOf(1)).to.be.equal(bob.address);
      });

      it("Allows contributor badge holders to trade the NFT to another address even after its related project fails", async () => {
        const { projectFactory, deployer, alice, bob } = await loadFixture(setupFixture);
        
        const txReceiptUnresolved = await projectFactory.connect(deployer).create(ethers.utils.parseEther("5"), "Project 2", "PROJ2");
        const txReceipt = await txReceiptUnresolved.wait();

        const projectAddress = txReceipt.events![0].args![0];
        const project: Project = (await ethers.getContractAt("Project", projectAddress)) as Project;

        await project.connect(alice).contribute({ value: ethers.utils.parseEther("1.1") });
        expect(await project.balanceOf(alice.address)).to.be.equal(1);

        await project.connect(deployer).cancelations(); // Fail the project

        await project.connect(alice).transferFrom(alice.address, bob.address, 1, { from: alice.address});
        expect(await project.ownerOf(1)).to.be.equal(bob.address);
      });
    });
  });
});
