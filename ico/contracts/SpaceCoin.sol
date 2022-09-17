//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
@title SpaceCoin Token (SPC).
@notice ERC20 token with a fee on transfers.
@author @benedictleekw
 */
contract SpaceCoin is ERC20 {
    event TransferToken(address to, uint256 amount, bool isTaxed);

    /**
    @notice Event emitted when the tax status
     */
    event EnabledFlag(bool flag);

    address public creatorAddress;

    /**
    @notice Treasury address used to hold transfer fees.
     */
    address public treasuryAddress;

    // % fee on transfers.
    uint8 public constant TAX_PERCENTAGE = 2;

    /**
    @notice Flag indicating wether the transfer fee is activated or not.
     */
    bool public taxEnabled;

    constructor(
        uint256 initialSupply,
        address _ownerAddress,
        address _icoAddress,
        address _treasuryAddress
    ) ERC20("SpaceCoin", "SPC") {
        creatorAddress = _ownerAddress;
        treasuryAddress = _treasuryAddress;
        _mint(address(_icoAddress), initialSupply * 10**18);
    }

    /**
    @notice Overrides ERC20 _transfer method.
     */
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

    /**
    @notice tax fee on transfers.
    @dev Only the owner can call this function.
     */
    function enabledTax(bool flag) public {
        require(
            creatorAddress == msg.sender,
            "SpaceCoin: Sender is not project owner"
        );
        taxEnabled = flag;
        emit EnabledFlag(flag);
    }
}
