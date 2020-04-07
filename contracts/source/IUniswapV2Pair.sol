pragma solidity 0.6.3;

contract IUniswapV2Pair {
    address public token0;
    address public token1;

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
}
