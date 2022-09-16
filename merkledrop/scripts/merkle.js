const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const airdroplist = require("../airdroplist.json");

const leaves = airdroplist.map((x) => keccak256(x));
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

const buf2hex = (x) => "0x" + x.toString("hex");
const root = buf2hex(tree.getRoot());
console.log("byte32 merkle tree root: ", buf2hex(tree.getRoot()));

const firstProof = tree.getProof(leaves[0]).map((x) => buf2hex(x.data));
console.log(firstProof);
console.log(tree.verify(firstProof, leaves[0], root));