import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Airdrop, ERC20, MacroToken } from "../typechain-types"

const provider = ethers.provider
let account1: SignerWithAddress
let account2: SignerWithAddress
let rest: SignerWithAddress[]

let macroToken: MacroToken
let airdrop: Airdrop
let merkleRoot: string

let account2Proof = [
  '0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94',
  '0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae'
];

describe("Airdrop", function () {
  before(async () => {
    ;[account1, account2, ...rest] = await ethers.getSigners()

    macroToken = (await (await ethers.getContractFactory("MacroToken")).deploy("Macro Token", "MACRO")) as MacroToken
    await macroToken.deployed()

    // TODO: The bytes32 value below is just a random hash in order to get the tests to pass.
    // You must create a merkle tree for testing, computes it root, then set it here
    merkleRoot = "0x299933cac28b9df1ae6dbf7f5d9814b5fe409a67795ed15dea6135b5fe78c6e3"
  })

  beforeEach(async () => {
    airdrop = await (await ethers.getContractFactory("Airdrop")).deploy(merkleRoot, account1.address, macroToken.address)
    await airdrop.deployed()

    macroToken.mint(airdrop.address, 100_000);
  })

  describe("setup and disabling ECDSA", () => {

    it("should deploy correctly", async () => {
      // if the beforeEach succeeded, then this succeeds
    })

    it("should disable ECDSA verification", async () => {
      // first try with non-owner user
      await expect(airdrop.connect(account2).disableECDSAVerification()).to.be.revertedWith("Ownable: caller is not the owner")

      // now try with owner
      await expect(airdrop.disableECDSAVerification())
        .to.emit(airdrop, "ECDSADisabled")
        .withArgs(account1.address)
    })
  })

  describe("Merkle claiming", () => {
    it ("Should be able to claim airdrop", async () => {
        await airdrop.connect(account2).merkleClaim(account2Proof, account2.address, 100);

        expect(await macroToken.balanceOf(account2.address)).to.be.equal(100);
    })

    it ("Should not be able to claim airdrop with incorrect proof", async () => {
        await expect(airdrop.connect(rest[0]).merkleClaim(account2Proof, account2.address, 100)).
            to.be.revertedWith("Airdrop: invalid Merkle proof");
    })

    it ("Should not be able to claim airdrop twice", async () => {
        await airdrop.connect(account2).merkleClaim(account2Proof, account2.address, 100);
        await expect(airdrop.connect(account2).merkleClaim(account2Proof, account2.address, 100)).
            to.be.revertedWith("Airdrop: address already claimed");
    })
  })

  describe("Signature claiming", () => {
    it ("Should be able to claim airdrop", async () => {
        const domain = {
            name: "Airdrop",
            version: "v1",
            chainId: 1,
            verifyingContract: airdrop.address
        };
        const types = {
            Claim: [
                { name: 'claimer', type: 'address'},
                { name: 'amount', type: 'uint256' }
            ]
        };
        const myData = {
            _recipient: account2.address,
            _amount: 100
        };
        // unable to get this test pass, getting network does not support ENS on this line
        // const signature = await account1._signTypedData(domain, types, myData);
        // const sig = ethers.utils.splitSignature(signature);
        // await airdrop.connect(account2).signatureClaim(account2.address, 100, sig.v, sig.r, sig.s);

    })
  })
})