import { expect } from "chai";
import { ethers, } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Governor } from "../typechain-types";
import { MockNftMarketplace } from "../typechain-types/test/mockNftMarketplace.sol/MockNftMarketplace";

const PROPOSAL_ACTIVE_DELAY = 780;
const PROPOSAL_ACTIVE_DEADLINE = 604800;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number) => {
    await time.increase(seconds);
};

// Voting options
const YES = 0;
const NO = 1;

// Proposal state
const PREACTIVE = 0;
const ACTIVE = 1;
const SUCCEED = 2;
const FAILED = 3;
const EXECUTED = 4;

const buildSignData = (address: any, proposalId: Number, vote: Number) => {
    const domain = {
        chainId: 31337,
        verifyingContract: address,
    };
    const types = {
        Ballot: [
            { name: 'proposalId', type: 'uint256' },
            { name: 'voteDecision', type: 'uint8' }
        ]
    };
    const data = {
        proposalId,
        voteDecision: vote
    };

    return { domain, types, data };
}

describe("Governor", () => {
    async function setupFixture() {
        const [deployer, treasury, alice, bob, ...addrs]: SignerWithAddress[] = await ethers.getSigners();
        const mockNftMarketplaceFactory = await ethers.getContractFactory("MockNftMarketplace");
        const mockNftMarketplace: MockNftMarketplace = (await mockNftMarketplaceFactory.deploy()) as MockNftMarketplace;
        await mockNftMarketplace.deployed();
        
        const governorFactory = await ethers.getContractFactory("Governor");
        const governor: Governor = (await governorFactory.deploy(mockNftMarketplace.address)) as Governor;
        await governor.deployed();

        return { governor, deployer, treasury, alice, bob, addrs}
    }

    describe("Deployment", () => {
        it("Deploys a contract", async () => {
            const { governor } = await loadFixture(setupFixture);

            expect(governor.address).to.be.a.properAddress;
        });

        it("Should set nftMarketplace address", async () => {
            const { governor } = await loadFixture(setupFixture);

            expect(await governor.nftMarketplace()).to.be.a.properAddress;
        });
    });

    describe("Membership", () => {
        it("Should be able to buy membership with 1 ETH", async () => {
            const { governor, alice } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            expect(await governor.memberAddress(alice.address)).to.not.equal(0);
        });

        it("Should not be able to buy membership less than 1 ETH", async () => {
            const { governor, alice } = await loadFixture(setupFixture);

            await expect(governor.connect(alice).buy({ value: ethers.utils.parseEther("0.8") }))
                .to.be.revertedWith("Governor: msg.value is not 1 ether");
        });

        it("Should not be able to buy membership more than 1 ETH", async () => {
            const { governor, alice } = await loadFixture(setupFixture);

            await expect(governor.connect(alice).buy({ value: ethers.utils.parseEther("1.1") }))
                .to.be.revertedWith("Governor: msg.value is not 1 ether");
        });

        it("Should not be able to buy more than 1 membership per address", async () => {
            const { governor, alice } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            await expect(governor.connect(alice).buy({ value: ethers.utils.parseEther("1") }))
                .to.be.revertedWith("Governor: sender is already a member");
        });
    });

    describe("Proposal System", () => {
        it("Should be able to create proposal by members", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            expect(await (await governor.connect(alice).proposals(proposalId)).startTime).to.not.equal(0);
        });

        it("Should not be able to create proposal by non-member", async () => {
            const { governor, bob, addrs } = await loadFixture(setupFixture);

            await expect(governor.connect(bob).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, ""))
                .to.be.revertedWith("Governor: The sender is not a member");
        });

        it("Should not be able to create 2 active proposals", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");

            await expect(governor.connect(alice).createBuyNFTProposal(addrs[1].address, 1234, ONE_ETHER, ""))
                .to.be.revertedWith("Governor: there can only be one active proposal per member");
        });

        it("Should not be able to create 2 identical proposals", async () => {
            const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
            await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");

            await expect(governor.connect(bob).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, ""))
                .to.be.revertedWith("Governor: proposal already exist");
        });

        it('Emits a ProposalCreated event after a proposal is created', async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            expect(txReceiptUnresolved)
              .to.emit(governor, "ProposalCreated")
              .withArgs(proposalId, alice.address);
        });

        it("Should be succeed proposal with quorum reached and yes more than no votes", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, NO);
            for (let i = 1; i <= 6; i++) {
                await governor.connect(addrs[i]).vote(proposalId, YES);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);
            
            expect(await governor.state(proposalId)).to.equal(SUCCEED);
        });

        it("Should be failed proposal with quorum reached but no more than yes votes", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, YES);
            for (let i = 1; i <= 6; i++) {
                await governor.connect(addrs[i]).vote(proposalId, NO);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);
            
            expect(await governor.state(proposalId)).to.equal(FAILED);
        });

        it("Should failed proposal with quorum not reached", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            for (let i = 1; i <= 2; i++) {
                await governor.connect(addrs[i]).vote(proposalId, YES);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);
            
            expect(await governor.state(proposalId)).to.equal(FAILED);
        });

        it("Should be able to execute proposal when the proposal succeed", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, NO);
            for (let i = 1; i <= 6; i++) {
                await governor.connect(addrs[i]).vote(proposalId, YES);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);

            await governor.connect(alice).executeBuyNFT(addrs[0].address, 123, ONE_ETHER, "");
            
            expect(await governor.state(proposalId)).to.equal(EXECUTED);
        });

        it("Should not be able to execute proposal twice", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, NO);
            for (let i = 1; i <= 6; i++) {
                await governor.connect(addrs[i]).vote(proposalId, YES);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);

            await governor.connect(alice).executeBuyNFT(addrs[0].address, 123, ONE_ETHER, "");

            await expect(governor.connect(alice).executeBuyNFT(addrs[0].address, 123, ONE_ETHER, ""))
                .to.be.revertedWith("Governor: proposal is not succeed state");
        });

        it("Should not be able to execute proposal when the proposal failed", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, YES);
            for (let i = 1; i <= 6; i++) {
                await governor.connect(addrs[i]).vote(proposalId, NO);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);

            await expect(governor.connect(alice).executeBuyNFT(addrs[0].address, 123, ONE_ETHER, ""))
                .to.be.revertedWith("Governor: proposal is not succeed state");
        });

        it("Should not be able to execute proposal by non-member", async () => {
            const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, NO);
            for (let i = 1; i <= 6; i++) {
                await governor.connect(addrs[i]).vote(proposalId, YES);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);

            await expect(governor.connect(bob).executeBuyNFT(addrs[0].address, 123, ONE_ETHER, ""))
                .to.be.revertedWith("Governor: The sender is not a member");
        });

        it("Emits a ProposalExecuted event after a proposal is executed", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            for (let i = 1; i <= 10; i++) {
                await governor.connect(addrs[i]).buy({ value: ethers.utils.parseEther("1") });
            }

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, NO);
            for (let i = 1; i <= 6; i++) {
                await governor.connect(addrs[i]).vote(proposalId, YES);
            }

            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);

            const tx = await governor.connect(alice).executeBuyNFT(addrs[0].address, 123, ONE_ETHER, "");
            
            expect(tx)
              .to.emit(governor, "ProposalExecuted")
              .withArgs(proposalId, alice.address);
        });
    });

    describe("Voting System", () => {
        it("Should be able to vote Yes by members", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, YES);
            
            expect(await (await governor.connect(alice).proposals(proposalId)).yesCount).to.equal(1);
        });

        it("Should be able to vote No by members", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, NO);
            
            expect(await (await governor.connect(alice).proposals(proposalId)).noCount).to.equal(1);
        });

        it("Should not be able to change vote or vote twice", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];

            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await governor.connect(alice).vote(proposalId, YES);
            
            await expect(governor.connect(alice).vote(proposalId, YES))
                .to.be.revertedWith("Governor: The voter has already voted");
        });

        it("Should not be able to vote by non-member", async () => {
            const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            await expect(governor.connect(bob).vote(proposalId, YES))
                .to.be.revertedWith("Governor: The sender is not a member");
        });

        it("Should not be able to vote immediately", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await expect(governor.connect(alice).vote(proposalId, YES))
                .to.be.revertedWith("Governor: The proposal is not active");
        });

        it("Should not be able to vote after proposal deadline", async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DEADLINE);
            await expect(governor.connect(alice).vote(proposalId, YES))
                .to.be.revertedWith("Governor: The proposal is not active");
        });

        it("Should not be able to vote on active proposal by new member", async () => {
            const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);

            await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
            await expect(governor.connect(bob).vote(proposalId, YES))
                .to.be.revertedWith("Governor: New members are not allowed to vote on active proposal");
        });

        it("Can't vote with sig if not a member", async () => {
            const { governor, alice, bob, addrs } = await loadFixture(setupFixture);
            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor
              .connect(alice)
              .createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();
            const proposalId = txReceipt.events![0].args![0];
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
          
            const domain = {
              chainId: 1,
              verifyingContract: governor.address,
            };
            const types = {
              Ballot: [
                { name: "proposalId", type: "uint256" },
                { name: "voteDecision", type: "uint8" },
              ],
            };
            const message = { proposalId: proposalId, voteDecision: YES };
            const signature = await bob._signTypedData(domain, types, message);
            const { v, r, s } = ethers.utils.splitSignature(signature);
          
            await expect(governor.connect(alice).voteSig(proposalId, YES, v, r, s)).to.be
              .reverted;
          });
        
        it('Emits a VoteCasted event after a proposal is voted', async () => {
            const { governor, alice, addrs } = await loadFixture(setupFixture);

            await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
            const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
            const txReceipt = await txReceiptUnresolved.wait();

            const proposalId = txReceipt.events![0].args![0];
            
            await timeTravel(PROPOSAL_ACTIVE_DELAY);
            const tx = await governor.connect(alice).vote(proposalId, YES);
            
            expect(tx)
              .to.emit(governor, "VoteCasted")
              .withArgs(proposalId, alice.address);
        });

        describe("VoteSig", function() {
            it("Should count votes that are passed by another caller who is member", async () => {
                const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

                await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
                await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
                const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
                const txReceipt = await txReceiptUnresolved.wait();

                const proposalId = txReceipt.events![0].args![0];
                
                await timeTravel(PROPOSAL_ACTIVE_DELAY);
                let { domain, types, data } = buildSignData(governor.address, proposalId, YES);
                const signature = await bob._signTypedData(domain, types, data);
                const sig = ethers.utils.splitSignature(signature);
                await governor.connect(alice).voteSig(proposalId, YES, sig.v, sig.r, sig.s);

                expect(await (await governor.connect(alice).proposals(proposalId)).yesCount).to.equal(1);
                expect(await (await governor.connect(alice).proposals(proposalId)).noCount).to.equal(0);
            });

            it("Can't vote with sig if not a member", async () => {
                const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

                await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
                const txReceiptUnresolved = await governor
                  .connect(alice)
                  .createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
                const txReceipt = await txReceiptUnresolved.wait();
                const proposalId = txReceipt.events![0].args![0];
                await timeTravel(PROPOSAL_ACTIVE_DELAY);
              
                let { domain, types, data } = buildSignData(governor.address, proposalId, YES);
                const signature = await bob._signTypedData(domain, types, data);
                const { v, r, s } = ethers.utils.splitSignature(signature);
              
                await expect(governor.connect(alice).voteSig(proposalId, YES, v, r, s)).to.be
                .reverted;
            });

            it("Should revert when voteSig is called twice with same voter", async () => {
                const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

                await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
                await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
                const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
                const txReceipt = await txReceiptUnresolved.wait();

                const proposalId = txReceipt.events![0].args![0];
                
                await timeTravel(PROPOSAL_ACTIVE_DELAY);
                let { domain, types, data } = buildSignData(governor.address, proposalId, YES);
                const signature = await bob._signTypedData(domain, types, data);
                const sig = ethers.utils.splitSignature(signature);
                await governor.connect(alice).voteSig(proposalId, YES, sig.v, sig.r, sig.s);

                expect(await (await governor.connect(alice).proposals(proposalId)).yesCount).to.equal(1);
                expect(await (await governor.connect(alice).proposals(proposalId)).noCount).to.equal(0);
                await expect(governor.connect(bob).voteSig(proposalId, YES, sig.v, sig.r, sig.s)).to.be
                .reverted;
            });

            it("Should revert when same voter did voteSig and then vote again", async () => {
                const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

                await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
                await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
                const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
                const txReceipt = await txReceiptUnresolved.wait();

                const proposalId = txReceipt.events![0].args![0];
                
                await timeTravel(PROPOSAL_ACTIVE_DELAY);
                let { domain, types, data } = buildSignData(governor.address, proposalId, YES);
                const signature = await bob._signTypedData(domain, types, data);
                const sig = ethers.utils.splitSignature(signature);
                await governor.connect(alice).voteSig(proposalId, YES, sig.v, sig.r, sig.s);

                expect(await (await governor.connect(alice).proposals(proposalId)).yesCount).to.equal(1);
                expect(await (await governor.connect(alice).proposals(proposalId)).noCount).to.equal(0);
                await expect(governor.connect(bob).vote(proposalId, YES)).to.be
                .reverted;
            });

            it("Should revert if votes decisions signature are different from caller (vote tempering)", async () => {
                const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

                await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
                await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
                const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
                const txReceipt = await txReceiptUnresolved.wait();

                const proposalId = txReceipt.events![0].args![0];
                
                await timeTravel(PROPOSAL_ACTIVE_DELAY);
                let { domain, types, data } = buildSignData(governor.address, proposalId, YES);
                const signature = await bob._signTypedData(domain, types, data);
                const sig = ethers.utils.splitSignature(signature);

                await expect(governor.connect(alice).voteSig(proposalId, NO, sig.v, sig.r, sig.s)).to.be
                .reverted;
            });

            it("Votes can be casted in bulk by a caller", async () => {
                const { governor, alice, bob, addrs } = await loadFixture(setupFixture);
                const member1 = addrs[1];

                await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
                await governor.connect(member1).buy({ value: ethers.utils.parseEther("1") });
                await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
                const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
                const txReceipt = await txReceiptUnresolved.wait();

                const proposalId = txReceipt.events![0].args![0];
                
                await timeTravel(PROPOSAL_ACTIVE_DELAY);
                let { domain, types, data } = buildSignData(governor.address, proposalId, YES);
                const signature = await bob._signTypedData(domain, types, data);
                const signature1 = await member1._signTypedData(domain, types, data);
                const sig = ethers.utils.splitSignature(signature);
                const sig1 = ethers.utils.splitSignature(signature1);
                
                const proposalIds = [proposalId, proposalId];
                const votes = [YES, YES];
                const v = [sig.v, sig1.v];
                const r = [sig.r, sig1.r];
                const s = [sig.s, sig1.s];
                await governor.connect(alice).voteSigs(proposalIds, votes, v, r, s);

                expect(await (await governor.connect(alice).proposals(proposalId)).yesCount).to.equal(2);
                expect(await (await governor.connect(alice).proposals(proposalId)).noCount).to.equal(0);
            });

            it("Should emit VoteCasted", async () => {
                const { governor, alice, bob, addrs } = await loadFixture(setupFixture);

                await governor.connect(bob).buy({ value: ethers.utils.parseEther("1") });
                await governor.connect(alice).buy({ value: ethers.utils.parseEther("1") });
                const txReceiptUnresolved = await governor.connect(alice).createBuyNFTProposal(addrs[0].address, 123, ONE_ETHER, "");
                const txReceipt = await txReceiptUnresolved.wait();

                const proposalId = txReceipt.events![0].args![0];
                
                await timeTravel(PROPOSAL_ACTIVE_DELAY);
                let { domain, types, data } = buildSignData(governor.address, proposalId, YES);
                const signature = await bob._signTypedData(domain, types, data);
                const sig = ethers.utils.splitSignature(signature);
                const tx = await governor.connect(alice).voteSig(proposalId, YES, sig.v, sig.r, sig.s);

                expect(tx)
                    .to.emit(governor, "VoteCasted")
                    .withArgs(proposalId, alice.address);
            });
        });
    });

   
});