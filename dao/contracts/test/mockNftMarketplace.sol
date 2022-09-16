//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface NftMarketplace {
    function getPrice(address nftContract, uint nftId) external returns (uint price);
    function buy(address nftContract, uint nftId) external payable returns (bool success);
}

contract MockNftMarketplace is NftMarketplace {
    constructor() {}

    function getPrice(address nftContract, uint nftId) external pure returns (uint price) {
        return 1 ether;
    }

    function buy(address nftContract, uint nftId) external payable returns (bool success) {
        return true;
    }
}
