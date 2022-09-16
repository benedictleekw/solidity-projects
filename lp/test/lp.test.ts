import { expect } from "chai";
import { ethers, } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ICO, SpaceCoin, SpaceLP, SpaceRouter, MockSpaceCoin } from "../typechain-types";

const SEED_PHASE = 0;
const GENERAL_PHASE = 1;
const OPEN_PHASE = 2;

describe("LP", () => {
    async function setupFixture() {
        const [deployer, treasury, alice, bob, ...addrs]: SignerWithAddress[] = await ethers.getSigners();
        const icoFactory = await ethers.getContractFactory("ICO");
        const ico: ICO = (await icoFactory.deploy(treasury.address)) as ICO;
        await ico.deployed();
        
        const tokenAddress = await ico.tokenAddress();
        const token: SpaceCoin = (await ethers.getContractAt("SpaceCoin", tokenAddress)) as SpaceCoin;

        const lpTokenFactory = await ethers.getContractFactory("SpaceLP");
        const lpToken: SpaceLP = (await lpTokenFactory.deploy(tokenAddress, treasury.address)) as SpaceLP;
        await lpToken.deployed();

        const spaceRouterFactory = await ethers.getContractFactory("SpaceRouter");
        const spaceRouter: SpaceRouter = (await spaceRouterFactory.deploy(lpToken.address, tokenAddress)) as SpaceRouter;
        await spaceRouter.deployed();

        return { ico, deployer, treasury, alice, bob, token, lpToken, spaceRouter, addrs}
    }

    describe("SpaceToken Contract", () => {
        it("Token name is SpaceCoin", async () => {
            const { token } = await loadFixture(setupFixture);

            expect(await token.name()).to.be.equal("SpaceCoin");
        });

        it("Token symbol is SPC", async () => {
            const { token } = await loadFixture(setupFixture);

            expect(await token.symbol()).to.be.equal("SPC");
        });

        it("Max supply of 500,000 SPC", async () => {
            const { token } = await loadFixture(setupFixture);
            const balance = await token.totalSupply();
            const normalized = balance.div(10**10);
            expect(normalized).to.be.equal(BigNumber.from(500_000*10**8));
        });
        
        it("Stores all 150,000 SPC to ICO contract on deploy", async () => {
            const { token, ico } = await loadFixture(setupFixture);
            const balance = await token.balanceOf(ico.address);
            const normalized = balance.div(10**10);
            expect(normalized).to.be.equal(BigNumber.from(150_000*10**8));
        });

        it("Stores all 350,000 SPC to treasury address on deploy", async () => {
            const { token, ico, treasury } = await loadFixture(setupFixture);
            const balance = await token.balanceOf(treasury.address);
            const normalized = balance.div(10**10);
            expect(normalized).to.be.equal(BigNumber.from(350_000*10**8));
        });

        describe("Tax", () => {
            it("Should be off by default", async () => {
                const { token } = await loadFixture(setupFixture);

                expect(await token.taxEnabled()).to.be.false;
            });
    
            it("Should allow owner to turn on/off", async () => {
                const { token, deployer } = await loadFixture(setupFixture);

                await token.connect(deployer).enabledTax(true);
                expect(await token.taxEnabled()).to.be.true;
            });
    
            it("Should not allow non-owner to turn on/off", async () => {
                const { token, alice } = await loadFixture(setupFixture);

                await expect(token.connect(alice).enabledTax(true))
                .to.be.revertedWith("SpaceCoin: Sender is not project owner");
            });
    
            it("Should charged 2% tax when tax is on", async () => {
                const { deployer, treasury, alice, bob } = await loadFixture(setupFixture);

                const MockSpaceCoinFactory = await ethers.getContractFactory("MockSpaceCoin");
                const mockSpaceCoin: MockSpaceCoin = (await MockSpaceCoinFactory.deploy(deployer.address, deployer.address, treasury.address)) as MockSpaceCoin;
                await mockSpaceCoin.deployed();

                await mockSpaceCoin.connect(alice).mintToken(100);
                expect(await mockSpaceCoin.balanceOf(alice.address)).to.be.equal(100);

                await mockSpaceCoin.connect(deployer).enabledTax(true);
                await mockSpaceCoin.connect(alice).transfer(bob.address, 100);
                expect(await mockSpaceCoin.balanceOf(bob.address)).to.be.equal(98);
            });
    
            it("Should deposit taxes into the treasury address", async () => {
                const { deployer, treasury, alice, bob } = await loadFixture(setupFixture);

                const MockSpaceCoinFactory = await ethers.getContractFactory("MockSpaceCoin");
                const mockSpaceCoin: MockSpaceCoin = (await MockSpaceCoinFactory.deploy(deployer.address, deployer.address, treasury.address)) as MockSpaceCoin;
                await mockSpaceCoin.deployed();
                
                const initialBalance = await mockSpaceCoin.balanceOf(treasury.address);
                await mockSpaceCoin.connect(alice).mintToken(100);
                await mockSpaceCoin.connect(deployer).enabledTax(true);
                await mockSpaceCoin.connect(alice).transfer(bob.address, 100);
                const finalBalance = await mockSpaceCoin.balanceOf(treasury.address);
                expect(finalBalance).to.be.equal(initialBalance.add(2));
            });
        })
    });

    describe("ICO Contract", () => {
        describe("Deployment", () => {
            it("Deploys a contract", async () => {
                const { ico } = await loadFixture(setupFixture);

                expect(ico.address).to.be.a.properAddress;
            });

            it("Should set SpaceCoin address on deploy", async () => {
                const { ico } = await loadFixture(setupFixture);

                expect(await ico.tokenAddress()).to.be.a.properAddress;
            });
        });

        describe("Management", () => {
            it("Should paused by default", async () => {
                const { ico } = await loadFixture(setupFixture);
                
                expect(await ico.isPause()).to.equal(true);
            });

            it("Should allow owner to change isPaused", async () => {
                const { ico, deployer } = await loadFixture(setupFixture);
                
                await ico.connect(deployer).setIsPaused(true);
                expect(await ico.isPause()).to.equal(true);
            });

            it("Should not allow non-owner to change isPaused", async () => {
                const { ico, alice } = await loadFixture(setupFixture);

                await expect(ico.connect(alice).setIsPaused(true))
                .to.be.revertedWith("ICO: The sender is not project owner");
            });

            it("Should allow owner to change phase", async () => {
                const { ico, deployer } = await loadFixture(setupFixture);
                
                await ico.connect(deployer).advancePhase();
                expect(await ico.phase()).to.equal(GENERAL_PHASE);
            });

            it("Should not allow non-owner to change phase", async () => {
                const { ico, alice } = await loadFixture(setupFixture);

                await expect(ico.connect(alice).advancePhase())
                .to.be.revertedWith("ICO: The sender is not project owner");
            });

            it("Should allow owner to add seed investor", async() => {
                const { ico, deployer, alice } = await loadFixture(setupFixture);

                await ico.connect(deployer).addAllowlistAddress([alice.address]);
                expect(await ico.allowlistAddress(alice.address)).to.be.true;
            });

            it("Should not allow owner to add seed investor", async() => {
                const { ico, alice, bob } = await loadFixture(setupFixture);

                await expect(ico.connect(bob).addAllowlistAddress([alice.address]))
                .to.be.revertedWith("ICO: The sender is not project owner");
            });
        });

        describe("Contributions and claims", () => {
            describe("Seed Phase", () => {
                it("Should allow allowlist address to contribute", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    expect(await ico.unclaimedContribution(alice.address)).to.equal(ethers.utils.parseEther("1"));
                });

                it("Should block non allowlist address from contribute", async () => {
                    const { ico, deployer, bob } = await loadFixture(setupFixture);

                    await ico.connect(deployer).setIsPaused(false);
                    await expect(ico.connect(bob).contribute({ value: ethers.utils.parseEther("1") }))
                    .to.be.revertedWith("ICO: msg.sender is not in the allowlist");
                });

                it("Should block contribute when it is paused", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(true);
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") }))
                    .to.be.revertedWith("ICO: ico state is paused");
                });

                it("Should block contribute when seed indiviual contribution has met", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1500") })
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("2") }))
                    .to.be.revertedWith("ICO: Seed phase individual contribution limit exceeded");
                });

                it("Should block contribute when seed total contribution has met", async () => {
                    const { ico, deployer, alice, addrs } = await loadFixture(setupFixture);

                    const addresses = addrs.map(addr => {
                        return addr.address;
                    });
                    await ico.connect(deployer).addAllowlistAddress([alice.address, ...addresses]);
                    await ico.connect(deployer).setIsPaused(false);
                    for (let i = 0; i <= 10; i++) {
                        await expect(ico.connect(addrs[i]).contribute({ value: ethers.utils.parseEther("1500") }))
                    }
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") }))
                    .to.be.revertedWith("ICO: Seed phase total contribution limit exceeded");
                });

                it("Should block claiming token", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    await expect(ico.connect(alice).claimToken())
                    .to.be.revertedWith("ICO: Can only claim token on open phase");
                });
            });

            describe("General Phase", () => {
                it("Should allow allowlist address to contribute", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    expect(await ico.unclaimedContribution(alice.address)).to.equal(ethers.utils.parseEther("1"));
                });

                it("Should allow non allowlist address to contribute", async () => {
                    const { ico, deployer, bob } = await loadFixture(setupFixture);

                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(bob).contribute({ value: ethers.utils.parseEther("1") });
                    expect(await ico.unclaimedContribution(bob.address)).to.equal(ethers.utils.parseEther("1"));
                });

                it("Should block contribute when it is paused", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(true);
                    await ico.connect(deployer).advancePhase();
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") }))
                    .to.be.revertedWith("ICO: ico state is paused");
                });

                it("Should block contribute when general indiviual contribution has met", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1000") })
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("2") }))
                    .to.be.revertedWith("ICO: General phase individual contribution limit exceeded");
                });

                it("Should block contribute when seed total contribution has met", async () => {
                    const { ico, deployer, alice, addrs } = await loadFixture(setupFixture);

                    const addresses = addrs.map(addr => {
                        return addr.address;
                    });
                    await ico.connect(deployer).addAllowlistAddress([alice.address, ...addresses]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    for (let i = 0; i <= 30; i++) {
                        await expect(ico.connect(addrs[i]).contribute({ value: ethers.utils.parseEther("1000") }))
                    }
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") }))
                    .to.be.revertedWith("ICO: fund goal has reached");
                });

                it("Should block claiming token", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    await expect(ico.connect(alice).claimToken())
                    .to.be.revertedWith("ICO: Can only claim token on open phase");
                });
            });

            describe("Open Phase", () => {
                it("Should allow allowlist address to contribute", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    expect(await ico.fundsRaised()).to.equal(ethers.utils.parseEther("1"));
                });

                it("Should allow non-allowlist address to contribute", async () => {
                    const { ico, deployer, bob } = await loadFixture(setupFixture);

                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(bob).contribute({ value: ethers.utils.parseEther("1") });
                    expect(await ico.fundsRaised()).to.equal(ethers.utils.parseEther("1"));
                });

                it("Should block contribute when it is paused", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(true);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(deployer).advancePhase();
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") }))
                    .to.be.revertedWith("ICO: ico state is paused");
                });

                it("Should block contribute when seed total contribution limit has met", async () => {
                    const { ico, deployer, alice, addrs } = await loadFixture(setupFixture);

                    const addresses = addrs.map(addr => {
                        return addr.address;
                    });
                    await ico.connect(deployer).addAllowlistAddress([alice.address, ...addresses]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(deployer).advancePhase();
                    for (let i = 0; i <= 30; i++) {
                        await expect(ico.connect(addrs[i]).contribute({ value: ethers.utils.parseEther("1000") }))
                    }
                    await expect(ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") }))
                    .to.be.revertedWith("ICO: fund goal has reached");
                });

                it("Should receive token on contribution", async () => {
                    const { ico, token, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    const balance = await token.connect(alice).balanceOf(alice.address);
                    const normalizedBalance = balance.div(10**10);
                    expect(normalizedBalance).to.be.equal(BigNumber.from(5*10**8));
                });

                it("Should allow claiming token", async () => {
                    const { ico, token, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(alice).claimToken();
                    const balance = await token.connect(alice).balanceOf(alice.address);
                    const normalizedBalance = balance.div(10**10);
                    expect(normalizedBalance).to.be.equal(BigNumber.from(5*10**8));
                });

                it("Should not allow claiming token twice", async () => {
                    const { ico, deployer, alice } = await loadFixture(setupFixture);

                    await ico.connect(deployer).addAllowlistAddress([alice.address]);
                    await ico.connect(deployer).setIsPaused(false);
                    await ico.connect(alice).contribute({ value: ethers.utils.parseEther("1") });
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(deployer).advancePhase();
                    await ico.connect(alice).claimToken();
                    await expect(ico.connect(alice).claimToken())
                    .to.be.revertedWith("ICO: There is no token to claim");
                });
            });
        });
    });

    describe("SpaceLP Contract", () => {
        describe("mint", () => {
            it("should mint LP token", async () => {
                const { ico, deployer, bob, token, lpToken } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("10") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("1")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5 * 10 ** 8));
                await lpToken.connect(bob).mint(bob.address);
                expect(await lpToken.connect(bob).balanceOf(bob.address)).to.not.equal(0);
            });

            it("should emit TokenMint on mint LP token", async () => {
                const { ico, deployer, bob, token, lpToken } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("10") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("1")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5 * 10 ** 8));
                expect(await lpToken.mint(bob.address)).to.emit(lpToken, "TokenMint");
            });
        });

        describe("burn", () => {
            it("should burn LP token", async () => {
                const { ico, deployer, bob, token, lpToken } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("10") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("1")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5 * 10 ** 8));
                await lpToken.mint(bob.address);
                const lpAmount = await lpToken.connect(bob).balanceOf(bob.address);
                await lpToken.connect(bob).transfer(lpToken.address, lpAmount);
                const initialEthBalance = await bob.getBalance();
                await lpToken.burn(bob.address);
                expect(await bob.getBalance()).to.be.equal(initialEthBalance.add(ethers.utils.parseEther("1")));
                expect(await lpToken.connect(bob).balanceOf(bob.address)).to.equal(0);
            });

            it("should emit TokenBurn on burn LP token", async () => {
                const { ico, deployer, bob, token, lpToken } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("10") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("1")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5 * 10 ** 8));
                await lpToken.connect(bob).mint(bob.address);
                const lpAmount = await lpToken.connect(bob).balanceOf(bob.address);
                await lpToken.connect(bob).transfer(lpToken.address, lpAmount);
                expect(await lpToken.burn(bob.address)).to.emit(lpToken, "TokenBurn");
            });
        });

        describe("swap", () => {
            it("should revert when trying to exchange eth for spc without transfering eth to SpaceLP", async () => {
                const { ico, deployer, alice, bob, token, lpToken } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("1000") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("100")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5000 * 10 ** 8));
                await lpToken.mint(bob.address);
                await expect(lpToken.connect(alice).swap(0, BigInt(500 * 10 ** 8), bob.address)).to.be.revertedWith("SpaceLP: ETH input cannot be 0");
            });

            it("should revert when trying to exchange more than or equal to reserve", async () => {
                const { ico, deployer, alice, bob, token, lpToken } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("1000") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("100")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5000 * 10 ** 8));
                await lpToken.mint(bob.address);
                await expect(lpToken.connect(alice).swap(0, BigInt(5000 * 10 ** 8), bob.address)).to.be.revertedWith("SpaceLP: not enough reserve");
            });

            it("should revert when trying to exchange more than 1 token", async () => {
                const { ico, deployer, alice, bob, token, lpToken } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("1000") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("100")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5000 * 10 ** 8));
                await lpToken.mint(bob.address);
                await expect(lpToken.connect(alice).swap(ethers.utils.parseEther("1"), BigInt(5000 * 10 ** 8), bob.address)).to.be.revertedWith("SpaceLP: can only swap 1 token at a time");
            });

            it("should revert when exchange eth for exceed amount of spc", async () => {
                const { ico, deployer, alice, bob, token, lpToken, addrs } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("1000") });
                await bob.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("1000")
                });
                await token.connect(bob).transfer(lpToken.address, BigInt(5000 * 10 ** 8));
                await lpToken.mint(bob.address);
                await alice.sendTransaction({
                    to: lpToken.address,
                    value: ethers.utils.parseEther("1")
                });
                await expect(lpToken.connect(alice).swap(0, BigInt(500 * 10 ** 8), alice.address)).to.be.revertedWith("SpaceLP: swapping SPC overdrew");
            });
        });
    });

    // these test is failing need to test
    describe("SpaceRouter Contract", () => {
        describe("addLiquidity", () => {
            it("should mint LP token", async () => {
                const { ico, deployer, bob, token, lpToken, spaceRouter } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("10") });
                await token.connect(bob).approve(spaceRouter.address, BigInt(5 * 10 ** 8), {
                    from: bob.address
                });
                await spaceRouter.connect(bob).addLiquidity(BigInt(5 * 10 ** 8), bob.address, {
                    value: ethers.utils.parseEther("1") 
                });
                expect(await lpToken.connect(bob).balanceOf(bob.address)).to.not.equal(0);
            });
        });

        describe("removeLiquidity", () => {
            it("should burn LP token", async () => {
                const { ico, deployer, bob, token, lpToken, spaceRouter } = await loadFixture(setupFixture);

                await ico.connect(deployer).setIsPaused(false);
                await ico.connect(deployer).advancePhase();
                await ico.connect(deployer).advancePhase();
                await ico.connect(bob).contribute({ value: ethers.utils.parseEther("10") });
                await token.connect(bob).approve(spaceRouter.address, BigInt(5 * 10 ** 8), {
                    from: bob.address
                });
                await spaceRouter.connect(bob).addLiquidity(BigInt(5 * 10 ** 8), bob.address, {
                    value: ethers.utils.parseEther("1") 
                });
                expect(await lpToken.connect(bob).balanceOf(bob.address)).to.not.equal(0);
                const lpAmount = await lpToken.connect(bob).balanceOf(bob.address);
                const initialEthBalance = await bob.getBalance();
                await lpToken.connect(bob).approve(spaceRouter.address, lpAmount, {
                    from: bob.address
                });
                await spaceRouter.connect(bob).removeLiquidity(lpAmount, bob.address);
                expect(await lpToken.connect(bob).balanceOf(bob.address)).to.equal(0);
            });
        });
    });
});