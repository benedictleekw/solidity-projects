//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceCoin is ERC20 {
    event TransferToken(address to, uint256 amount, bool isTaxed);
    event EnabledFlag(bool flag);

    address public creatorAddress;
    address public treasuryAddress;
    uint128 constant MAX_SUPPLY = 500_000;
    uint128 constant ICO_SUPPLY = 150_000;
    uint8 public constant TAX_PERCENTAGE = 2;
    bool public taxEnabled;

    constructor(
        address _ownerAddress,
        address _icoAddress,
        address _treasuryAddress
    ) ERC20("SpaceCoin", "SPC") {
        creatorAddress = _ownerAddress;
        treasuryAddress = _treasuryAddress;
        _mint(address(_icoAddress), ICO_SUPPLY * 10**18);
        _mint(_treasuryAddress, (MAX_SUPPLY - ICO_SUPPLY) * 10**18);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (taxEnabled) {
            uint256 taxAmount = ((amount * (100 + TAX_PERCENTAGE)) / 100) -
                amount;
            uint256 afterTaxAmount = amount - taxAmount;
            super._transfer(from, treasuryAddress, taxAmount);
            super._transfer(from, to, afterTaxAmount);

            emit TransferToken(to, afterTaxAmount, true);
        } else {
            super._transfer(from, to, amount);

            emit TransferToken(to, amount, false);
        }
    }

    function enabledTax(bool flag) public {
        require(
            creatorAddress == msg.sender,
            "SpaceCoin: Sender is not project owner"
        );
        taxEnabled = flag;
        emit EnabledFlag(flag);
    }
}
