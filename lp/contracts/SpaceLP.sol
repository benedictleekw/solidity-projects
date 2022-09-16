//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import './libraries/Math.sol';
import "./SpaceCoin.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceLP is ERC20 {

    address public immutable spaceCoinAddress;
    address public immutable treasury;

    // pack into 1 slot, gas saving
    uint128 private spcReserve;
    uint128 public ethReserve;

    uint public previousK;

    event TokenMint(address mintAddress, uint256 lpAmount);
    event SwapToken(uint amountIn, uint amountOut, address to);
    event BurnToken(uint ethAmount, uint spcAmount, address to);

    constructor(address _spaceCoin, address _treasury) ERC20("ETH-SPC LP", "ETHSPC") {
        spaceCoinAddress = _spaceCoin;
        treasury = _treasury;
    }

    function mint(address to) external returns (uint lpAmount) {
        uint128 _ethReserve = ethReserve;
        uint128 _spcReserve = spcReserve;
        uint _ethBalance = address(this).balance;
        uint _spcBalance = SpaceCoin(spaceCoinAddress).balanceOf(address(this));
        uint ethAmount = _ethBalance - _ethReserve;
        uint spcAmount = _spcBalance - _spcReserve;

        uint _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            lpAmount = Math.sqrt(ethAmount * spcAmount);
        } else {
            lpAmount = Math.min((ethAmount * _totalSupply) / _ethReserve, (spcAmount * _totalSupply) / _spcReserve);
        }
        require(lpAmount > 0, "SpaceLP: invalid of minting zero space-eth lp");
        _mint(to, lpAmount);

        ethReserve = uint128(_ethBalance);
        spcReserve = uint128(_spcBalance);
        previousK = ethReserve * spcReserve;

        emit TokenMint(to, lpAmount);
    }

    function swap(uint ethAmountOut, uint spcAmountOut, address to) external {
        require(ethAmountOut > 0 || spcAmountOut > 0, "SpaceLP: amount must be more than 0");
        require(ethAmountOut == 0 || spcAmountOut == 0, "SpaceLP: can only swap 1 token at a time");
        uint128 _ethReserve = ethReserve;
        uint128 _spcReserve = spcReserve;
        require(ethAmountOut < ethReserve && spcAmountOut < spcReserve, "SpaceLP: not enough reserve");

        if(ethAmountOut > 0) {
            (bool success, ) = payable(to).call{value: ethAmountOut}("");
            require(success, "SpaceLP: eth transfer failed");

            uint _spcBalance = SpaceCoin(spaceCoinAddress).balanceOf(address(this));
            uint _ethBalance = address(this).balance;
            uint spcAmountIn = _spcBalance - (_spcReserve - spcAmountOut);
            require(spcAmountIn > 0, "SpaceLP: SPC input cannot be 0");
            uint spcNewBalance = (_spcBalance * 1000) - (spcAmountIn * 10);
            require(_ethBalance * spcNewBalance >= uint(_ethReserve) * uint(_spcReserve) * (1000**2), "SpaceLP: swapping ETH overdrew");

            spcReserve = uint128(_spcBalance);
            ethReserve = uint128(_ethBalance);
            emit SwapToken(spcAmountIn, ethAmountOut, to);
        } else {
            SpaceCoin(spaceCoinAddress).transfer(to, spcAmountOut);

            uint _ethBalance = address(this).balance;
            uint _spcBalance = SpaceCoin(spaceCoinAddress).balanceOf(address(this));
            
            uint ethAmountIn = _ethBalance - (_ethReserve - ethAmountOut);
            require(ethAmountIn > 0, "SpaceLP: ETH input cannot be 0");
            uint ethNewBalance = (_ethBalance * 1000) - (ethAmountIn * 10);
            require(ethNewBalance * _spcBalance >= uint(_ethReserve) * _spcReserve * (1000**2), "SpaceLP: swapping SPC overdrew");

            ethReserve = uint128(_ethBalance);
            spcReserve = uint128(_spcBalance);
            emit SwapToken(ethAmountIn, spcAmountOut, to);
        }
    }

    function burn(address to) external returns (uint ethAmount, uint spcAmount) {
        uint _ethBalance = address(this).balance;
        uint _spcBalance = SpaceCoin(spaceCoinAddress).balanceOf(address(this));
        uint _totalSupply = totalSupply();
        uint liquidity = balanceOf(address(this));

        ethAmount = liquidity * _ethBalance / _totalSupply;
        spcAmount = liquidity * _spcBalance / _totalSupply;
        _burn(address(this), liquidity);
        (bool success, ) = payable(to).call{value: ethAmount}("");
        require(success, "SpaceLP: eth transfer failed");
        SpaceCoin(spaceCoinAddress).transfer(to, spcAmount);
        _ethBalance = address(this).balance;
        _spcBalance = SpaceCoin(spaceCoinAddress).balanceOf(address(this));

        ethReserve = uint128(_ethBalance);
        spcReserve = uint128(_spcBalance);
        previousK = ethReserve * spcReserve;

        emit BurnToken(ethAmount, spcAmount, to);
    }

    function getReserves() public view returns (uint128 _ethReserve, uint128 _spcReserve) {
        _ethReserve = ethReserve;
        _spcReserve = spcReserve;
    }

    receive() external payable{
    
    } 
}

        