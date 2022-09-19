//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import './libraries/Math.sol';
import "./SpaceCoin.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceLP is ERC20 {

    address public immutable spaceCoinAddress;
    address public immutable treasury;

    /**
    @notice Current reserves/holdings for each spc and eth in the LP.
    @dev pack into 1 slot, gas saving.
    @dev the reason to have reserves for the token pair is because it is possible for the real
        balance to get out of sync. There is no way to withdraw tokens without the contract's 
        consent, but deposits are a different matter. An account can transfer tokens to the 
        exchange without calling either mint or swap.
     */
    uint128 private spcReserve;
    uint128 public ethReserve;

    /**
    @notice Last constant curve value
    @dev reserve0 * reserve1, as of immediately after the most recent liquidity event.
     */
    uint public previousK;

    event TokenMint(address mintAddress, uint256 lpAmount);
    event SwapToken(uint amountIn, uint amountOut, address to);
    event BurnToken(uint ethAmount, uint spcAmount, address to);

    constructor(address _spaceCoin, address _treasury) ERC20("ETH-SPC LP", "ETHSPC") {
        spaceCoinAddress = _spaceCoin;
        treasury = _treasury;
    }

    /**
    @notice Mint lp token
    @param to address to send the lp token to
    @dev This function is called when a liquidity provider adds liquidity to the pool.
    @dev Additional liquidity token is minted as reward for providing SPC and ETH
     */
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

    /**
    @notice Swap between token1 and token2
    @dev Transfer is optimistic, because we transfer before we are sure all the conditions are met. 
        This is OK in Ethereum because if the conditions aren't met later in the call we revert out 
        of it and any changes it created.
    @dev On getting current balances. The periphery contract sends us the tokens before calling us 
        for the swap. This makes it easy for the contract to check that it is not being cheated, 
        a check that has to happen in the core contract (because we can be called by other entities 
        than our periphery contract).
     */
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

    /**
    @notice Burn LP token and return eth and spc
    @param to address to send the eth and spc to
    @dev The periphery contract transferred the liquidity to be burned to this contract before the call. 
        That way we know how much liquidity to burn, and we can make sure that it gets burned.
    @dev The liquidity provider receives equal value of both tokens. This way we don't change the exchange rate.
     */
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

        