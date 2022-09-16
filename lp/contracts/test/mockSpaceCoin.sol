//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "../SpaceCoin.sol";

contract MockSpaceCoin is SpaceCoin {
    constructor(
        address _owner,
        address _addressMinter,
        address _treasuryAddress
    ) SpaceCoin(_owner, _addressMinter, _treasuryAddress) {}

    function mintToken(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
