//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import {SpaceCoin} from "./SpaceCoin.sol";
import {SpaceLP} from "./SpaceLP.sol";

contract SpaceRouter {
    SpaceLP public immutable spaceLP;
    SpaceCoin public immutable spaceCoin;

    constructor(address payable lpTokenAddress, address spaceCoinAddress) {
        spaceLP = SpaceLP(lpTokenAddress);
        spaceCoin = SpaceCoin(spaceCoinAddress);
    }

    function addLiquidity(uint spcAmountDesired, address to) payable external returns(uint ethAmount, uint spcAmount, uint lpAmount) {
        (ethAmount, spcAmount) = _getOptimalPairAmount(msg.value, spcAmountDesired);
        (bool success, ) = payable(address(spaceLP)).call{value: ethAmount}("");
        require(success, "SpaceRouter: eth transfer failed");
        spaceCoin.transferFrom(msg.sender, address(spaceLP), spcAmount);
        lpAmount = spaceLP.mint(to);
        // send back extra eth
        if (msg.value > ethAmount) {
            (bool succeed, ) = payable(address(msg.sender)).call{value: msg.value - ethAmount}("");
            require(succeed, "SpaceRouter: eth transfer failed");
        }
    }

    function _getOptimalPairAmount(
        uint ethAmountDesired,
        uint spcAmountDesired
    ) internal view returns (uint ethAmount, uint spcAmount) {
        (uint ethReserve, uint spcReserve) = spaceLP.getReserves();
        if (ethReserve == 0 && spcReserve == 0) {
            ethAmount = ethAmountDesired;
            spcAmount = spcAmountDesired;
        } else {
            uint spcAmountOptimal = ethAmount * spcReserve / ethReserve;
            if (spcAmountOptimal <= spcAmountDesired) {
                ethAmount = ethAmountDesired;
                spcAmount = spcAmountOptimal;
            } else {
                uint ethAmountOptimal = spcAmount * ethReserve / spcReserve;
                ethAmount = ethAmountOptimal;
                spcAmount = spcAmountDesired;
            }
        }
        spcAmount = getSpcAmountTaxed(spcAmount);
    }

    function removeLiquidity(uint liquidity, address to) external returns (uint ethAmount, uint spcAmount) {
        spaceLP.transferFrom(msg.sender, address(spaceLP), liquidity);
        (ethAmount, spcAmount) = spaceLP.burn(to);
    }

    function swapExactETHForToken(uint spcAmountMin, address to) external payable returns (uint spcAmount) {
        (uint ethReserve, uint spcReserve) = spaceLP.getReserves();
        spcAmount = _calAmountOut(msg.value, ethReserve, spcReserve);
        spcAmount = getSpcAmountTaxed(spcAmount);
        require(spcAmount >= spcAmountMin, "SpaceRouter: SPC output doesn't met min requirement");
        (bool success, ) = payable(address(spaceLP)).call{value: msg.value}("");
        require(success, "SpaceRouter: swap eth transfer failed");
        spaceLP.swap(0, spcAmount, to); // The first args is 0 since we are swapping ETH for SPC. 
    }

    function swapExactTokensForETH(uint spcAmount, uint ethAmountMin, address to) external returns (uint ethAmount) {
        (uint ethReserve, uint spcReserve) = spaceLP.getReserves();
        spcAmount = getSpcAmountTaxed(spcAmount);
        ethAmount = _calAmountOut(spcAmount, spcReserve, ethReserve);
        require(ethAmount >= ethAmountMin, "SpaceRouter: ETH output doesn't met min requirement");
        spaceLP.transferFrom(msg.sender, address(spaceLP), spcAmount);
        spaceLP.swap(ethAmount, 0, to);
    }

    function _calAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amount) {
        uint amountInAfterFees = amountIn * 990;
        uint numerator = amountInAfterFees * reserveOut;
        uint denominator = reserveIn * 1000 + amountInAfterFees;
        amount = numerator / denominator;
    }

    function getSpcAmountTaxed(uint spcAmount) internal view returns (uint spcAmountAfterTax) {
        spcAmountAfterTax = spaceCoin.taxEnabled() ? spcAmount * 98 / 100 : spcAmount;
    }
}